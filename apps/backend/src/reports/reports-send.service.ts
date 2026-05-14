import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CraStatus as PrismaCraStatus } from '@prisma/client';
import { AuditAction } from '@esn/shared-types';
import type { ReportRecipient, SendReportResponse } from '@esn/shared-types';
import { ConfigService } from '@nestjs/config';
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

interface MissionActorRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface MissionRow {
  id: string;
  title: string;
  employeeId: string;
  esnAdminId: string | null;
  clientId: string | null;
  esnAdmin: MissionActorRow | null;
  client: MissionActorRow | null;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
}

interface UserRow extends MissionActorRow {
  esnReferentId: string | null;
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
    private readonly config: ConfigService,
  ) {}

  async sendMonthlyReport(
    dto: SendReportDto,
    employeeId: string,
  ): Promise<SendReportResponse> {
    const { year, month, reportType, recipients } = dto;

    // ── 1. Resolve employee ──────────────────────────────────────────────
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, email: true, esnReferentId: true },
    }) as UserRow | null;
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    // ── 2. Resolve active mission ────────────────────────────────────────
    const mission = await this.prisma.mission.findFirst({
      where: { employeeId, isActive: true },
      include: {
        esnAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }) as MissionRow | null;
    if (!mission) throw new NotFoundException(`No active mission for employee ${employeeId}`);

    // ── 3. Resolve recipients (skip if actor null) ───────────────────────
    // ESN routes to the employee's designated referent admin, not the mission-level admin.
    const recipientMap: Record<ReportRecipient, string | null> = {
      ESN: employee.esnReferentId,
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

    // ── 3b. Auto-submit CRA if DRAFT with entries ────────────────────────
    const craMonthRaw = await this.prisma.craMonth.findFirst({
      where: { employeeId, year, month },
      include: { entries: { select: { id: true } } },
    }) as { id: string; status: string; entries: { id: string }[] } | null;

    if (craMonthRaw?.status === PrismaCraStatus.DRAFT && craMonthRaw.entries.length > 0) {
      await this.prisma.craMonth.update({
        where: { id: craMonthRaw.id },
        data: { status: PrismaCraStatus.SUBMITTED, submittedAt: new Date() },
      });
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.CRA_SUBMITTED,
          resource: `cra_month:${craMonthRaw.id}`,
          initiatorId: employeeId,
        },
      });
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

    // ── 7. Archive previous PENDING/REFUSED validation requests for same period ──
    await this.prisma.reportValidationRequest.updateMany({
      where: {
        employeeId,
        year,
        month,
        reportType,
        status: { in: ['PENDING', 'REFUSED'] },
        recipient: { in: sentTo },
      },
      data: { status: 'ARCHIVED' },
    });

    // ── 8. Create validation requests + notify recipients ─────────────────
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';
    const ttlHours = Math.min(dto.validationTtlHours ?? 48, 168);
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    const employeeFullName = `${employee.firstName} ${employee.lastName}`;
    const subject = `Rapport mensuel — ${this.monthLabel(month)} ${year} — ${employeeFullName}`;

    for (const recipient of sentTo) {
      const validationRequest = await this.prisma.reportValidationRequest.create({
        data: {
          employeeId,
          year,
          month,
          reportType,
          recipient,
          pdfS3Key,
          expiresAt,
        },
      }) as { id: string; token: string };

      const validationLink = `${frontendUrl}/validate-report/${validationRequest.token}`;
      const body =
        `Le rapport mensuel de ${employeeFullName} pour ${this.monthLabel(month)} ${year} est disponible.\n\n` +
        `Cliquez sur le lien ci-dessous pour valider ou refuser ce rapport :\n${validationLink}\n\n` +
        `Ce lien expire dans ${ttlHours} heures.`;

      const userId = recipientMap[recipient] as string;
      await this.notifications.notifyEmail(userId, subject, body);
    }

    // ── 9. Audit log ──────────────────────────────────────────────────────
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
