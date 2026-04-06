import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@esn/shared-types';
import type {
  ValidateReportPublicInfo,
  ValidateReportRequest,
  ValidateReportResponse,
} from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface ValidationRequestRow {
  id: string;
  token: string;
  employeeId: string;
  year: number;
  month: number;
  reportType: string;
  recipient: string;
  pdfS3Key: string;
  status: string;
  comment: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  employee: { firstName: string; lastName: string };
}

@Injectable()
export class ReportsValidateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── GET /reports/validate/:token ──────────────────────────────────────────

  async getValidationInfo(token: string): Promise<ValidateReportPublicInfo> {
    const row = await this.findValidRequest(token);
    return this.toPublicInfo(row);
  }

  // ── POST /reports/validate/:token ─────────────────────────────────────────

  async submitValidation(
    token: string,
    body: ValidateReportRequest,
  ): Promise<ValidateReportResponse> {
    const row = await this.findValidRequest(token);

    // Idempotent: already resolved
    if (row.status === 'VALIDATED' || row.status === 'REFUSED') {
      return this.buildResponse(row, false);
    }

    // REFUSE requires comment
    if (body.action === 'REFUSE' && (!body.comment || body.comment.trim() === '')) {
      throw new BadRequestException('Un commentaire est obligatoire en cas de refus.');
    }

    const newStatus = body.action === 'VALIDATE' ? 'VALIDATED' : 'REFUSED';

    const updated = await this.prisma.reportValidationRequest.update({
      where: { token },
      data: {
        status: newStatus,
        resolvedBy: body.validatorName,
        resolvedAt: new Date(),
        ...(body.comment ? { comment: body.comment } : {}),
      },
    }) as { id: string; employeeId: string; year: number; month: number; reportType: string; recipient: string };

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: newStatus === 'VALIDATED' ? AuditAction.REPORT_VALIDATED : AuditAction.REPORT_REFUSED,
        resource: `report-validation:${updated.id}`,
        initiatorId: updated.employeeId,
        metadata: {
          token,
          recipient: updated.recipient,
          resolvedBy: body.validatorName,
          comment: body.comment ?? null,
        },
      },
    });

    // Check if all sent recipients are now VALIDATED
    const allValidated = await this.checkAllValidated(
      updated.employeeId,
      updated.year,
      updated.month,
      updated.reportType,
    );

    // Notify employee
    const employeeName = `${row.employee.firstName} ${row.employee.lastName}`;
    await this.notifyEmployee(updated.employeeId, row, newStatus, employeeName, body, allValidated);

    return this.buildResponse({ ...row, status: newStatus }, allValidated);
  }

  // ── PATCH /reports/validation/:id/archive ────────────────────────────────

  async archiveValidation(id: string, callerId: string): Promise<void> {
    const row = await this.findRequestById(id);
    await this.assertEsnScope(row.employeeId, callerId);

    await this.prisma.reportValidationRequest.update({
      where: { id },
      data: { status: 'ARCHIVED', resolvedAt: new Date(), resolvedBy: callerId },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.REPORT_VALIDATED, // closest available; indicates ESN acted on the report
        resource: `report-validation:${id}`,
        initiatorId: callerId,
        metadata: { action: 'ARCHIVED', employeeId: row.employeeId },
      },
    });
  }

  // ── PATCH /reports/validation/:id/remind ─────────────────────────────────

  async remindEmployee(id: string, callerId: string): Promise<void> {
    const row = await this.findRequestById(id);
    await this.assertEsnScope(row.employeeId, callerId);

    // Only notify — do NOT archive. The ESN admin can still see the row
    // and use "Archiver" explicitly if they want to remove it from the list.
    const period = `${this.monthLabel(row.month)} ${row.year}`;
    const subject = `Rapport ${period} — Nouveau dépôt demandé`;
    const message =
      `Votre rapport mensuel de ${period} n'a pas pu être validé (lien expiré).\n\n` +
      `Merci de soumettre à nouveau votre rapport depuis votre espace salarié.`;
    await this.notifications.notifyEmail(row.employeeId, subject, message);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async findValidRequest(token: string): Promise<ValidationRequestRow> {
    const row = await this.prisma.reportValidationRequest.findUnique({
      where: { token },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }) as ValidationRequestRow | null;

    if (!row) throw new NotFoundException('Lien de validation introuvable.');
    if (row.status === 'ARCHIVED') throw new GoneException('Ce lien de validation a expiré ou a été archivé.');
    if (new Date() > row.expiresAt) throw new GoneException('Ce lien de validation a expiré.');

    return row;
  }

  private toPublicInfo(row: ValidationRequestRow): ValidateReportPublicInfo {
    return {
      token: row.token,
      employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
      year: row.year,
      month: row.month,
      reportType: row.reportType as ValidateReportPublicInfo['reportType'],
      recipient: row.recipient as ValidateReportPublicInfo['recipient'],
      status: row.status as ValidateReportPublicInfo['status'],
      expiresAt: row.expiresAt.toISOString(),
      resolvedBy: row.resolvedBy,
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      comment: row.comment,
    };
  }

  private buildResponse(
    row: { status: string },
    allValidated: boolean,
  ): ValidateReportResponse {
    return {
      success: true,
      status: row.status as ValidateReportResponse['status'],
      allValidated,
    };
  }

  private async checkAllValidated(
    employeeId: string,
    year: number,
    month: number,
    reportType: string,
  ): Promise<boolean> {
    const pending = await this.prisma.reportValidationRequest.count({
      where: {
        employeeId,
        year,
        month,
        reportType,
        status: { in: ['PENDING', 'REFUSED'] },
      },
    });
    return pending === 0;
  }

  private async notifyEmployee(
    employeeId: string,
    row: ValidationRequestRow,
    newStatus: string,
    employeeName: string,
    body: ValidateReportRequest,
    allValidated: boolean,
  ): Promise<void> {
    const period = `${this.monthLabel(row.month)} ${row.year}`;

    if (newStatus === 'VALIDATED') {
      const subject = allValidated
        ? `Rapport ${period} — Finalisé`
        : `Rapport ${period} — Validé par ${row.recipient}`;
      const message = allValidated
        ? `Votre rapport mensuel de ${period} a été validé par tous les destinataires et est maintenant finalisé.`
        : `Votre rapport mensuel de ${period} a été validé par ${body.validatorName} (${row.recipient}).`;
      await this.notifications.notifyEmail(employeeId, subject, message);
    } else {
      const subject = `Rapport ${period} — Refusé par ${row.recipient}`;
      const message =
        `Votre rapport mensuel de ${period} a été refusé par ${body.validatorName} (${row.recipient}).\n\n` +
        `Motif : ${body.comment ?? '—'}`;
      await this.notifications.notifyEmail(employeeId, subject, message);
    }
  }

  /** Find a validation request by its primary key (no status/expiry check). */
  private async findRequestById(id: string): Promise<ValidationRequestRow> {
    const row = await this.prisma.reportValidationRequest.findUnique({
      where: { id },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }) as ValidationRequestRow | null;

    if (!row) throw new NotFoundException('Demande de validation introuvable.');
    if (row.status === 'ARCHIVED') throw new GoneException('Cette demande a déjà été archivée.');
    return row;
  }

  /** Verify the caller (ESN_ADMIN/ESN_MANAGER) belongs to the same ESN as the employee. */
  private async assertEsnScope(employeeId: string, callerId: string): Promise<void> {
    const [employee, caller] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: employeeId }, select: { esnId: true } }),
      this.prisma.user.findUnique({ where: { id: callerId }, select: { esnId: true } }),
    ]);

    if (!employee?.esnId || !caller?.esnId || employee.esnId !== caller.esnId) {
      throw new ForbiddenException('Accès refusé : le salarié n\'appartient pas à votre ESN.');
    }
  }

  private monthLabel(month: number): string {
    const NAMES = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    return NAMES[month - 1] ?? String(month);
  }
}
