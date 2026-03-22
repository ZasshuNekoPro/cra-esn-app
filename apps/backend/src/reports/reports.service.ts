import {
  Injectable,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { WeatherState, MilestoneStatus, CraEntryType, AuditAction, LeaveType } from '@esn/shared-types';
import type {
  MonthlyReport,
  ProjectPresentation,
  DashboardShareResponse,
  PublicDashboard,
  ProjectBreakdownItem,
  ReportProjectSummary,
  WeatherDataPoint,
  DaysByMonth,
  SentReportHistoryItem,
  ReportValidationItem,
  ReportDownloadResponse,
} from '@esn/shared-types';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../database/prisma.service';
import { countWorkingDays } from '../cra/utils/working-days.util';

const WORK_TYPES = new Set<string>([
  CraEntryType.WORK_ONSITE,
  CraEntryType.WORK_REMOTE,
  CraEntryType.WORK_TRAVEL,
  CraEntryType.TRAINING,
  CraEntryType.ASTREINTE,
  CraEntryType.OVERTIME,
]);

const LEAVE_TYPES = new Set<string>([CraEntryType.LEAVE_CP, CraEntryType.LEAVE_RTT]);

const WEATHER_NUMERIC: Record<string, number> = {
  [WeatherState.SUNNY]: 1,
  [WeatherState.CLOUDY]: 2,
  [WeatherState.RAINY]: 3,
  [WeatherState.STORM]: 4,
  [WeatherState.VALIDATION_PENDING]: 2,
  [WeatherState.VALIDATED]: 1,
};

const PORTION_TO_DAYS: Record<string, number> = {
  FULL: 1,
  HALF_AM: 0.5,
  HALF_PM: 0.5,
};

const MAX_TTL_HOURS = 168;
const DEFAULT_TTL_HOURS = 48;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── getMonthlyReport ───────────────────────────────────────────────────────

  async getMonthlyReport(employeeId: string, year: number, month: number): Promise<MonthlyReport> {
    const user = await this.prisma.user.findUnique({ where: { id: employeeId } });
    if (!user) throw new NotFoundException(`Employee ${employeeId} not found`);

    const mission = await this.prisma.mission.findFirst({
      where: { employeeId, isActive: true },
    });
    if (!mission) throw new NotFoundException(`No active mission for employee ${employeeId}`);

    const craMonth = await this.prisma.craMonth.findFirst({
      where: { employeeId, year, month },
      include: { mission: true, entries: { include: { projectEntries: true } } },
    });

    // Working days for the month (public holidays)
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, country: 'FR' },
    });
    const holidayDates = holidays.map((h) => new Date(h.date));
    const workingDaysInMonth = countWorkingDays(
      year,
      month,
      holidayDates,
      mission.startDate,
      mission.endDate ?? undefined,
    );

    // Tally entries
    let totalWorkDays = 0;
    let totalLeaveDays = 0;
    let totalSickDays = 0;
    let totalHolidayDays = 0;

    type EntryRow = { entryType: string; dayFraction: unknown };
    const entries: EntryRow[] = (craMonth as unknown as { entries?: EntryRow[] })?.entries ?? [];

    for (const entry of entries) {
      const fraction = toNumber(entry.dayFraction);
      const type = entry.entryType;
      if (WORK_TYPES.has(type)) {
        totalWorkDays += fraction;
      } else if (LEAVE_TYPES.has(type)) {
        totalLeaveDays += fraction;
      } else if ((type as CraEntryType) === CraEntryType.SICK) {
        totalSickDays += fraction;
      } else if ((type as CraEntryType) === CraEntryType.HOLIDAY) {
        totalHolidayDays += fraction;
      }
    }

    const isOvertime = totalWorkDays > workingDaysInMonth;

    // Project breakdown (via ProjectEntry for this employee/month)
    const projectBreakdown = await this.buildProjectBreakdown(employeeId, year, month);

    // Leave balances
    const leaveBalances = await this.buildLeaveBalances(employeeId, year);

    // Projects summary
    const projects = await this.buildProjectsSummary(employeeId, year, month);

    return {
      employeeId,
      employeeName: `${user.firstName} ${user.lastName}`,
      missionTitle: mission.title,
      year,
      month,
      generatedAt: new Date().toISOString(),
      craStatus: craMonth ? (craMonth.status as string as import('@esn/shared-types').CraStatus) : null,
      pdfUrl: craMonth?.pdfUrl ?? null,
      totalWorkDays,
      totalLeaveDays,
      totalSickDays,
      totalHolidayDays,
      workingDaysInMonth,
      isOvertime,
      projectBreakdown,
      leaveBalances,
      projects,
    };
  }

  // ── getProjectPresentation ────────────────────────────────────────────────

  async getProjectPresentation(
    projectId: string,
    callerId: string,
    from?: string,
    to?: string,
  ): Promise<ProjectPresentation> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, mission: { employeeId: callerId } },
      include: {
        weatherEntries: { orderBy: { date: 'asc' } },
        milestones: { where: { status: { not: MilestoneStatus.ARCHIVED as never } }, orderBy: { dueDate: 'asc' } },
        entries: { orderBy: { date: 'asc' } },
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    // Weather history — filter + map to numeric
    type WeatherRow = { id: string; date: Date; state: string };
    let weatherEntries = project.weatherEntries as unknown as WeatherRow[];
    if (fromDate) weatherEntries = weatherEntries.filter((w) => w.date >= fromDate);
    if (toDate) weatherEntries = weatherEntries.filter((w) => w.date <= toDate);

    const weatherHistory: WeatherDataPoint[] = weatherEntries.map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      state: w.state as WeatherState,
      numericValue: WEATHER_NUMERIC[w.state] ?? 1,
    }));

    // Entries — filter + aggregate by month
    type EntryRow = { date: Date; portion: string | null };
    let entries = project.entries as unknown as EntryRow[];
    if (fromDate) entries = entries.filter((e) => e.date >= fromDate);
    if (toDate) entries = entries.filter((e) => e.date <= toDate);

    const byMonth = new Map<string, number>();
    let totalDaysSpent = 0;
    for (const e of entries) {
      const d = PORTION_TO_DAYS[e.portion ?? 'FULL'] ?? 1;
      const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + d);
      totalDaysSpent += d;
    }

    const daysByMonth: DaysByMonth[] = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, days]) => ({ month, days }));

    // Milestones
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    type MilestoneRow = { id: string; title: string; status: string; dueDate: Date | null; completedAt: Date | null };
    const milestones = (project.milestones as unknown as MilestoneRow[]).map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status as MilestoneStatus,
      dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : null,
      isLate: m.dueDate != null && m.dueDate < today && (m.status as MilestoneStatus) !== MilestoneStatus.DONE,
    }));

    const milestoneDoneCount = milestones.filter((m) => m.status === MilestoneStatus.DONE).length;

    return {
      projectId: project.id,
      projectName: project.name,
      description: project.description,
      startDate: project.startDate.toISOString().slice(0, 10),
      endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : null,
      estimatedDays: project.estimatedDays,
      from: from ?? null,
      to: to ?? null,
      weatherHistory,
      daysByMonth,
      milestones,
      milestoneDoneCount,
      milestoneTotalCount: milestones.length,
      totalDaysSpent,
    };
  }

  // ── createDashboardShare ──────────────────────────────────────────────────

  async createDashboardShare(ownerId: string, ttlHours?: number): Promise<DashboardShareResponse> {
    const resolvedTtl = Math.min(ttlHours ?? DEFAULT_TTL_HOURS, MAX_TTL_HOURS);
    const expiresAt = new Date(Date.now() + resolvedTtl * 60 * 60 * 1000);

    const share = await this.prisma.dashboardShare.create({
      data: { ownerId, expiresAt },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.DASHBOARD_SHARE_CREATED,
        resource: `dashboard_share:${share.token}`,
        initiatorId: ownerId,
      },
    });

    return {
      token: share.token,
      expiresAt: share.expiresAt.toISOString(),
      shareUrl: `/shared/${share.token}`,
    };
  }

  // ── revokeDashboardShare ──────────────────────────────────────────────────

  async revokeDashboardShare(token: string, ownerId: string): Promise<void> {
    const share = await this.prisma.dashboardShare.findFirst({
      where: { token, ownerId },
    });

    if (!share) throw new NotFoundException('Lien de partage introuvable');

    await this.prisma.dashboardShare.update({
      where: { id: share.id },
      data: { revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.DASHBOARD_SHARE_REVOKED,
        resource: `dashboard_share:${token}`,
        initiatorId: ownerId,
      },
    });
  }

  // ── getPublicDashboard ────────────────────────────────────────────────────

  async getPublicDashboard(token: string): Promise<PublicDashboard> {
    const share = await this.prisma.dashboardShare.findUnique({
      where: { token },
      include: { owner: true },
    });

    if (!share) throw new NotFoundException('Lien de partage invalide');
    if (share.revokedAt !== null || share.expiresAt < new Date()) {
      throw new GoneException('Ce lien de partage a expiré ou a été révoqué');
    }

    // Increment access count (fire-and-forget)
    void this.prisma.dashboardShare.update({
      where: { id: share.id },
      data: { accessCount: { increment: 1 } },
    });

    void this.prisma.auditLog.create({
      data: {
        action: AuditAction.DASHBOARD_SHARED_ACCESSED,
        resource: `dashboard_share:${token}`,
        initiatorId: share.ownerId,
        metadata: { accessCount: share.accessCount + 1 },
      },
    });

    const owner = share.owner as { id: string; firstName: string; lastName: string };
    const mission = await this.prisma.mission.findFirst({
      where: { employeeId: owner.id, isActive: true },
    });

    // Current month CRA (only public fields)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { employeeId: owner.id, year, month },
      include: { entries: true },
    });

    type EntryRow = { entryType: string; dayFraction: unknown };
    let totalWorkDays = 0;
    for (const entry of (craMonth as unknown as { entries?: EntryRow[] })?.entries ?? []) {
      if (WORK_TYPES.has(entry.entryType)) {
        totalWorkDays += toNumber(entry.dayFraction);
      }
    }

    // Active projects with latest weather (public)
    const projects = await this.prisma.project.findMany({
      where: { mission: { employeeId: owner.id }, status: 'ACTIVE' as never },
      include: {
        weatherEntries: { orderBy: { date: 'desc' }, take: 1 },
        milestones: {
          where: {
            dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
            status: { in: ['PLANNED', 'IN_PROGRESS'] as never[] },
          },
          orderBy: { dueDate: 'asc' },
          take: 3,
        },
      },
    });

    return {
      employeeName: `${owner.firstName} ${owner.lastName}`,
      missionTitle: mission?.title ?? '',
      currentMonth: craMonth
        ? { year, month, totalWorkDays, craStatus: craMonth.status }
        : null,
      projects: projects.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        latestWeatherState:
          (p.weatherEntries as Array<{ state: string }>)[0]?.state as WeatherState ?? null,
        upcomingMilestones: (p.milestones as Array<{ title: string; dueDate: Date | null }>).map(
          (m) => ({
            title: m.title,
            dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : null,
          }),
        ),
      })),
      expiresAt: share.expiresAt.toISOString(),
    };
  }

  // ── getSentReportHistory ──────────────────────────────────────────────────

  async getSentReportHistory(employeeId: string): Promise<SentReportHistoryItem[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { initiatorId: employeeId, action: AuditAction.REPORT_SENT },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Fetch all validation requests for this employee at once
    const validationRows = await this.prisma.reportValidationRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'asc' },
    }) as Array<{
      id: string;
      token: string;
      year: number;
      month: number;
      reportType: string;
      recipient: string;
      status: string;
      comment: string | null;
      resolvedBy: string | null;
      resolvedAt: Date | null;
      expiresAt: Date;
      createdAt: Date;
    }>;

    return logs.map((log) => {
      const meta = log.metadata as {
        reportType?: string;
        sentTo?: string[];
        skippedRecipients?: string[];
        pdfS3Key?: string;
      } | null ?? {};

      // resource format: "report:<employeeId>:<year>:<month>"
      const parts = (log.resource ?? '').split(':');
      const year = parseInt(parts[2] ?? '0', 10);
      const month = parseInt(parts[3] ?? '0', 10);
      const reportType = meta.reportType ?? 'CRA_ONLY';

      const validations: ReportValidationItem[] = validationRows
        .filter(
          (v) => v.year === year && v.month === month && v.reportType === reportType,
        )
        .map((v) => ({
          id: v.id,
          token: v.token,
          recipient: v.recipient as ReportValidationItem['recipient'],
          status: v.status as ReportValidationItem['status'],
          comment: v.comment,
          resolvedBy: v.resolvedBy,
          resolvedAt: v.resolvedAt ? v.resolvedAt.toISOString() : null,
          expiresAt: v.expiresAt.toISOString(),
          createdAt: v.createdAt.toISOString(),
        }));

      return {
        id: log.id,
        sentAt: log.createdAt.toISOString(),
        year,
        month,
        reportType: reportType as import('@esn/shared-types').ReportType,
        sentTo: (meta.sentTo ?? []) as import('@esn/shared-types').ReportRecipient[],
        skippedRecipients: (meta.skippedRecipients ?? []) as import('@esn/shared-types').ReportRecipient[],
        validations,
      };
    });
  }

  // ── getDownloadUrl ────────────────────────────────────────────────────────

  async getSentReportDownloadUrl(
    auditLogId: string,
    employeeId: string,
  ): Promise<ReportDownloadResponse> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id: auditLogId },
    }) as { id: string; initiatorId: string; metadata: unknown } | null;

    if (!log) throw new NotFoundException(`AuditLog ${auditLogId} not found`);
    if (log.initiatorId !== employeeId) throw new NotFoundException(`AuditLog ${auditLogId} not found`);

    const meta = log.metadata as { pdfS3Key?: string } | null ?? {};
    if (!meta.pdfS3Key) throw new NotFoundException('No PDF associated with this report entry');

    const url = await this.storage.getDownloadUrl(meta.pdfS3Key, 300);
    return { url };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async buildProjectBreakdown(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<ProjectBreakdownItem[]> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const entries = await this.prisma.projectEntry.findMany({
      where: {
        employeeId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { project: { select: { name: true } } },
    });

    const map = new Map<string, { projectName: string; days: number }>();
    for (const e of entries as Array<{ projectId: string; portion: string | null; project: { name: string } }>) {
      const d = PORTION_TO_DAYS[e.portion ?? 'FULL'] ?? 1;
      const existing = map.get(e.projectId);
      if (existing) {
        existing.days += d;
      } else {
        map.set(e.projectId, { projectName: e.project.name, days: d });
      }
    }

    return Array.from(map.entries()).map(([projectId, { projectName, days }]) => ({
      projectId,
      projectName,
      days,
    }));
  }

  private async buildLeaveBalances(employeeId: string, year: number) {
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        userId: employeeId,
        year,
        leaveType: { in: [LeaveType.PAID_LEAVE, LeaveType.RTT] },
      },
    });
    return balances.map((bal) => {
      const total = toNumber(bal.totalDays);
      const used = toNumber(bal.usedDays);
      return {
        leaveType: bal.leaveType as import('@esn/shared-types').LeaveType,
        totalDays: total,
        usedDays: used,
        remainingDays: total - used,
      };
    });
  }

  private async buildProjectsSummary(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<ReportProjectSummary[]> {
    const monthEnd = new Date(year, month, 0);

    const projects = await this.prisma.project.findMany({
      where: { mission: { employeeId } },
      include: {
        weatherEntries: { orderBy: { date: 'desc' }, take: 1 },
        milestones: {
          where: { status: { not: MilestoneStatus.ARCHIVED as never } },
          select: { status: true, dueDate: true },
        },
      },
    });

    return projects.map((p) => {
      type WeRow = { state: string };
      type MRow = { status: string; dueDate: Date | null };
      const latestWeather = (p.weatherEntries as WeRow[])[0]?.state as WeatherState ?? null;
      const milestones = p.milestones as unknown as MRow[];
      const milestonesDue = milestones.filter(
        (m) =>
          m.dueDate !== null &&
          m.dueDate <= monthEnd &&
          (m.status as MilestoneStatus) !== MilestoneStatus.DONE,
      ).length;
      const milestonesLate = milestones.filter(
        (m) => (m.status as MilestoneStatus) === MilestoneStatus.LATE,
      ).length;

      return {
        projectId: p.id,
        projectName: p.name,
        latestWeatherState: latestWeather,
        milestonesDue,
        milestonesLate,
      };
    });
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
