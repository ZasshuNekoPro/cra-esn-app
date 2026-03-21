import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@esn/shared-types';
import type { ReportRecipient, SendReportResponse } from '@esn/shared-types';
import { MonthlyReportPdfGenerator } from '@esn/pdf-generator';
import type {
  MonthlyReportCraEntry,
  MonthlyReportData,
  MonthlyReportProject,
  ProjectWeatherData,
} from '@esn/pdf-generator';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { SendReportDto } from './dto/send-report.dto';

// ── Internal helper types ──────────────────────────────────────────────────

interface MissionRow {
  id: string;
  title: string;
  employeeId: string;
  esnAdminId: string | null;
  clientId: string | null;
  esnAdmin: UserRow | null;
  client: UserRow | null;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CraEntryRow {
  date: Date;
  entryType: string;
  dayFraction: unknown;
  comment: string | null;
  projectEntries: Array<{ project: { id: string; name: string } }>;
}

interface CraMonthRow {
  id: string;
  year: number;
  month: number;
  status: string;
  entries: CraEntryRow[];
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
}

interface WeatherEntryRow {
  date: Date;
  state: string;
  comment: string | null;
  project: { name: string };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class ReportsSendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly pdfGenerator: MonthlyReportPdfGenerator,
  ) {}

  async sendMonthlyReport(
    dto: SendReportDto,
    employeeId: string,
    missionId: string,
  ): Promise<SendReportResponse> {
    const { year, month, reportType, recipients } = dto;

    // ── 1. Resolve employee ──────────────────────────────────────────────
    const employee = await this.prisma.user.findUnique({ where: { id: employeeId } }) as UserRow | null;
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    // ── 2. Resolve mission ───────────────────────────────────────────────
    const mission = await this.prisma.mission.findFirst({
      where: { id: missionId, employeeId, isActive: true },
      include: {
        esnAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }) as MissionRow | null;
    if (!mission) throw new NotFoundException(`Mission ${missionId} not found`);

    // ── 3. Resolve recipients (skip if actor null) ───────────────────────
    const recipientMap: Record<ReportRecipient, string | null> = {
      ESN: mission.esnAdminId,
      CLIENT: mission.clientId,
    };

    const sentTo: ReportRecipient[] = [];
    const skippedRecipients: ReportRecipient[] = [];

    for (const recipient of recipients) {
      if (recipientMap[recipient] === null || recipientMap[recipient] === undefined) {
        skippedRecipients.push(recipient);
      } else {
        sentTo.push(recipient);
      }
    }

    if (sentTo.length === 0) {
      throw new BadRequestException(
        'Tous les destinataires ont été ignorés car la mission n\'a ni ESN admin ni client associé.',
      );
    }

    // ── 4. Build MonthlyReportData ───────────────────────────────────────
    const reportData = await this.buildMonthlyReportData(
      employee,
      mission,
      year,
      month,
      reportType,
    );

    // ── 5. Generate PDF ──────────────────────────────────────────────────
    const pdfBuffer = await this.pdfGenerator.generate(reportData);

    // ── 6. Upload to S3 ──────────────────────────────────────────────────
    const ts = Date.now();
    const s3Key = `reports/${employeeId}/${year}/${month}/${reportType}-${ts}.pdf`;
    const pdfS3Key = await this.storage.uploadFile(pdfBuffer, s3Key, 'application/pdf', pdfBuffer.length);

    // ── 7. Notify each effective recipient ───────────────────────────────
    const subject = `Rapport mensuel — ${this.monthLabel(month)} ${year} — ${employee.firstName} ${employee.lastName}`;
    const body = `Le rapport mensuel de ${employee.firstName} ${employee.lastName} pour ${this.monthLabel(month)} ${year} est disponible.`;

    for (const recipient of sentTo) {
      const userId = recipientMap[recipient] as string;
      await this.notifications.notifyEmail(userId, subject, body);
    }

    // ── 8. Audit log ─────────────────────────────────────────────────────
    const auditLog = await this.prisma.auditLog.create({
      data: {
        action: AuditAction.REPORT_SENT,
        resource: `report:${employeeId}:${year}:${month}`,
        initiatorId: employeeId,
        metadata: { reportType, sentTo, skippedRecipients, pdfS3Key },
      },
    }) as { id: string };

    return {
      success: true,
      sentTo,
      pdfS3Key,
      auditLogId: auditLog.id,
      skippedRecipients,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async buildMonthlyReportData(
    employee: UserRow,
    mission: MissionRow,
    year: number,
    month: number,
    reportType: 'CRA_ONLY' | 'CRA_WITH_WEATHER',
  ): Promise<MonthlyReportData> {
    // CRA entries
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { employeeId: employee.id, year, month },
      include: {
        entries: {
          include: { projectEntries: { include: { project: { select: { id: true, name: true } } } } },
        },
      },
    }) as CraMonthRow | null;

    const craEntries: MonthlyReportCraEntry[] = (craMonth?.entries ?? []).map((e) => ({
      date: e.date,
      entryType: e.entryType,
      dayFraction: toNumber(e.dayFraction),
      comment: e.comment,
      projects: e.projectEntries.map((pe) => ({ name: pe.project.name })),
    }));

    // Projects
    const projectRows = await this.prisma.project.findMany({
      where: { mission: { id: mission.id } },
    }) as ProjectRow[];

    const projects: MonthlyReportProject[] = projectRows.map((p) => ({
      projectId: p.id,
      projectName: p.name,
      status: p.status,
    }));

    // Weather data (only for CRA_WITH_WEATHER)
    let weatherData: ProjectWeatherData[] | undefined;
    if (reportType === 'CRA_WITH_WEATHER') {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const weatherRows = await this.prisma.weatherEntry.findMany({
        where: {
          project: { mission: { id: mission.id } },
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { project: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }) as WeatherEntryRow[];

      const byProject = new Map<string, ProjectWeatherData>();
      for (const row of weatherRows) {
        const existing = byProject.get(row.project.name);
        if (existing) {
          existing.entries.push({ date: row.date, state: row.state, comment: row.comment });
        } else {
          byProject.set(row.project.name, {
            projectName: row.project.name,
            entries: [{ date: row.date, state: row.state, comment: row.comment }],
          });
        }
      }
      weatherData = Array.from(byProject.values());
    }

    return {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      esnName: mission.esnAdmin ? `${mission.esnAdmin.firstName} ${mission.esnAdmin.lastName}` : 'Non renseigné',
      esnManagerName: mission.esnAdmin ? `${mission.esnAdmin.firstName} ${mission.esnAdmin.lastName}` : null,
      clientName: mission.client ? `${mission.client.firstName} ${mission.client.lastName}` : 'Non renseigné',
      clientManagerName: mission.client ? `${mission.client.firstName} ${mission.client.lastName}` : null,
      year,
      month,
      reportType,
      craEntries,
      projects,
      ...(weatherData !== undefined ? { weatherData } : {}),
    };
  }

  private monthLabel(month: number): string {
    const NAMES = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return NAMES[month - 1] ?? String(month);
  }
}
