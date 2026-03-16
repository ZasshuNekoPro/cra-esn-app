import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CraStatus as PrismaCraStatus,
  ValidationStatus as PrismaValidationStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CraPdfService } from './cra-pdf.service';

// ── Internal types ──────────────────────────────────────────────────────────

type MissionRow = {
  id: string;
  employeeId: string;
  esnAdminId: string | null;
  clientId: string | null;
  title: string;
};

type CraMonthRow = {
  id: string;
  year: number;
  month: number;
  status: PrismaCraStatus;
  pdfUrl: string | null;
  submittedAt: Date | null;
  lockedAt: Date | null;
  signedByEmployeeAt: Date | null;
  signedByEsnAt: Date | null;
  signedByClientAt: Date | null;
  rejectionComment: string | null;
  employeeId: string;
  missionId: string;
  mission: MissionRow;
  entries: { id: string }[];
  createdAt: Date;
  updatedAt: Date;
};

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CraSignatureService {
  private readonly logger = new Logger(CraSignatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly craPdf: CraPdfService,
  ) {}

  // ── submit ────────────────────────────────────────────────────────────────

  async submit(craMonthId: string, employeeId: string): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (craMonth.status !== PrismaCraStatus.DRAFT) {
      throw new ConflictException('CRA must be in DRAFT state');
    }

    if (craMonth.entries.length === 0) {
      throw new BadRequestException('CRA has no entries');
    }

    if (craMonth.employeeId !== employeeId) {
      throw new ForbiddenException('You can only submit your own CRA');
    }

    const now = new Date();

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.SUBMITTED,
        submittedAt: now,
      },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_SUBMITTED',
        resource: `cra_month:${craMonthId}`,
        initiatorId: employeeId,
      },
    });

    if (craMonth.mission.esnAdminId !== null) {
      await this.notifications.notify(
        craMonth.mission.esnAdminId,
        'Nouveau CRA à valider',
        `Le salarié a soumis son CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')}.`,
      );
    }

    return updated as unknown as CraMonthRow;
  }

  // ── retract ───────────────────────────────────────────────────────────────

  async retract(craMonthId: string, employeeId: string): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (craMonth.status !== PrismaCraStatus.SUBMITTED) {
      throw new ConflictException('CRA must be in SUBMITTED state to retract');
    }

    if (craMonth.employeeId !== employeeId) {
      throw new ForbiddenException('You can only retract your own CRA');
    }

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: { status: PrismaCraStatus.DRAFT },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_RETRACTED',
        resource: `cra_month:${craMonthId}`,
        initiatorId: employeeId,
      },
    });

    return updated as unknown as CraMonthRow;
  }

  // ── signEmployee ──────────────────────────────────────────────────────────

  async signEmployee(craMonthId: string, employeeId: string): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (craMonth.status !== PrismaCraStatus.SUBMITTED) {
      throw new ConflictException('CRA must be in SUBMITTED state to sign as employee');
    }

    if (craMonth.employeeId !== employeeId) {
      throw new ForbiddenException('You can only sign your own CRA');
    }

    const now = new Date();

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.SIGNED_EMPLOYEE,
        signedByEmployeeAt: now,
      },
      include: { mission: true, entries: true },
    });

    // Create ValidationRequest for ESN_ADMIN
    if (craMonth.mission.esnAdminId !== null) {
      await this.prisma.validationRequest.create({
        data: {
          craMonthId,
          validatorId: craMonth.mission.esnAdminId,
          status: PrismaValidationStatus.PENDING,
        },
      });

      await this.notifications.notify(
        craMonth.mission.esnAdminId,
        'CRA signé par le salarié, en attente de votre validation',
        `Le salarié a signé son CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')} et attend votre validation.`,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_SIGNED_EMPLOYEE',
        resource: `cra_month:${craMonthId}`,
        initiatorId: employeeId,
      },
    });

    return updated as unknown as CraMonthRow;
  }

  // ── signEsn ───────────────────────────────────────────────────────────────

  async signEsn(craMonthId: string, esnAdminId: string): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (craMonth.status !== PrismaCraStatus.SIGNED_EMPLOYEE) {
      throw new ConflictException('CRA must be in SIGNED_EMPLOYEE state for ESN to sign');
    }

    // Verify the caller is the ESN admin of this mission
    if (craMonth.mission.esnAdminId !== esnAdminId) {
      throw new ForbiddenException('You are not the ESN admin for this mission');
    }

    const now = new Date();

    // Resolve the pending ESN ValidationRequest
    const pendingEsnRequest = await this.prisma.validationRequest.findFirst({
      where: {
        craMonthId,
        validatorId: esnAdminId,
        status: PrismaValidationStatus.PENDING,
      },
    });

    if (pendingEsnRequest !== null) {
      await this.prisma.validationRequest.update({
        where: { id: pendingEsnRequest.id },
        data: {
          status: PrismaValidationStatus.APPROVED,
          resolvedAt: now,
        },
      });
    }

    // Transition to SIGNED_ESN
    const esnSigned = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.SIGNED_ESN,
        signedByEsnAt: now,
      },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_SIGNED_ESN',
        resource: `cra_month:${craMonthId}`,
        initiatorId: esnAdminId,
      },
    });

    // Notify the employee
    await this.notifications.notify(
      craMonth.employeeId,
      'Votre CRA a été validé par l\'ESN',
      `Votre CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')} a été validé par l'ESN.`,
    );

    // If mission has no client: auto-advance to SIGNED_CLIENT then trigger PDF generation
    if (craMonth.mission.clientId === null) {
      const finalUpdated = await this.prisma.craMonth.update({
        where: { id: craMonthId },
        data: {
          status: PrismaCraStatus.SIGNED_CLIENT,
          signedByClientAt: now,
        },
        include: { mission: true, entries: true },
      });

      // T5: Trigger PDF generation and auto-lock (SIGNED_CLIENT → LOCKED)
      void this.craPdf.generateAndUpload(craMonthId).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`generateAndUpload failed for ${craMonthId}: ${message}`);
      });

      return finalUpdated as unknown as CraMonthRow;
    }

    // If mission has a client: create CLIENT ValidationRequest
    await this.prisma.validationRequest.create({
      data: {
        craMonthId,
        validatorId: craMonth.mission.clientId,
        status: PrismaValidationStatus.PENDING,
      },
    });

    // Notify the client
    await this.notifications.notify(
      craMonth.mission.clientId,
      'Un CRA est en attente de votre validation',
      `Le CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')} est en attente de votre validation.`,
    );

    return esnSigned as unknown as CraMonthRow;
  }

  // ── rejectEsn ─────────────────────────────────────────────────────────────

  async rejectEsn(
    craMonthId: string,
    esnAdminId: string,
    comment: string,
  ): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (!comment || comment.trim().length === 0) {
      throw new BadRequestException('Rejection comment is required');
    }

    if (craMonth.status !== PrismaCraStatus.SIGNED_EMPLOYEE) {
      throw new ConflictException('CRA must be in SIGNED_EMPLOYEE state for ESN to reject');
    }

    if (craMonth.mission.esnAdminId !== esnAdminId) {
      throw new ForbiddenException('You are not the ESN admin for this mission');
    }

    const now = new Date();

    // Resolve the pending ESN ValidationRequest as REJECTED
    const pendingEsnRequest = await this.prisma.validationRequest.findFirst({
      where: {
        craMonthId,
        validatorId: esnAdminId,
        status: PrismaValidationStatus.PENDING,
      },
    });

    if (pendingEsnRequest !== null) {
      await this.prisma.validationRequest.update({
        where: { id: pendingEsnRequest.id },
        data: {
          status: PrismaValidationStatus.REJECTED,
          resolvedAt: now,
          comment,
        },
      });
    }

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.DRAFT,
        rejectionComment: comment,
      },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_REJECTED_ESN',
        resource: `cra_month:${craMonthId}`,
        metadata: { comment },
        initiatorId: esnAdminId,
      },
    });

    await this.notifications.notify(
      craMonth.employeeId,
      'Votre CRA a été refusé par l\'ESN',
      `Votre CRA a été refusé : ${comment}`,
    );

    return updated as unknown as CraMonthRow;
  }

  // ── signClient ────────────────────────────────────────────────────────────

  async signClient(craMonthId: string, clientId: string): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (craMonth.status !== PrismaCraStatus.SIGNED_ESN) {
      throw new ConflictException('CRA must be in SIGNED_ESN state for client to sign');
    }

    if (craMonth.mission.clientId !== clientId) {
      throw new ForbiddenException('You are not the client for this mission');
    }

    const now = new Date();

    // Resolve the pending CLIENT ValidationRequest
    const pendingClientRequest = await this.prisma.validationRequest.findFirst({
      where: {
        craMonthId,
        validatorId: clientId,
        status: PrismaValidationStatus.PENDING,
      },
    });

    if (pendingClientRequest !== null) {
      await this.prisma.validationRequest.update({
        where: { id: pendingClientRequest.id },
        data: {
          status: PrismaValidationStatus.APPROVED,
          resolvedAt: now,
        },
      });
    }

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.SIGNED_CLIENT,
        signedByClientAt: now,
      },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_SIGNED_CLIENT',
        resource: `cra_month:${craMonthId}`,
        initiatorId: clientId,
      },
    });

    await this.notifications.notify(
      craMonth.employeeId,
      'Votre CRA a été validé par le client',
      `Votre CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')} a été validé par le client.`,
    );

    if (craMonth.mission.esnAdminId !== null) {
      await this.notifications.notify(
        craMonth.mission.esnAdminId,
        'CRA finalisé, génération du PDF en cours',
        `Le CRA pour ${craMonth.year}/${String(craMonth.month).padStart(2, '0')} a été signé par toutes les parties. La génération du PDF est en cours.`,
      );
    }

    // T5: Trigger PDF generation and auto-lock (SIGNED_CLIENT → LOCKED)
    // Fire-and-forget: do not block the response on PDF generation
    void this.craPdf.generateAndUpload(craMonthId).catch((err: unknown) => {
      // Log error but do not propagate — the CRA is already SIGNED_CLIENT
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`generateAndUpload failed for ${craMonthId}: ${message}`);
    });

    return updated as unknown as CraMonthRow;
  }

  // ── rejectClient ──────────────────────────────────────────────────────────

  async rejectClient(
    craMonthId: string,
    clientId: string,
    comment: string,
  ): Promise<CraMonthRow> {
    const craMonth = await this.loadCraMonth(craMonthId);

    if (!comment || comment.trim().length === 0) {
      throw new BadRequestException('Rejection comment is required');
    }

    if (craMonth.status !== PrismaCraStatus.SIGNED_ESN) {
      throw new ConflictException('CRA must be in SIGNED_ESN state for client to reject');
    }

    if (craMonth.mission.clientId !== clientId) {
      throw new ForbiddenException('You are not the client for this mission');
    }

    const now = new Date();

    // Resolve the pending CLIENT ValidationRequest as REJECTED
    const pendingClientRequest = await this.prisma.validationRequest.findFirst({
      where: {
        craMonthId,
        validatorId: clientId,
        status: PrismaValidationStatus.PENDING,
      },
    });

    if (pendingClientRequest !== null) {
      await this.prisma.validationRequest.update({
        where: { id: pendingClientRequest.id },
        data: {
          status: PrismaValidationStatus.REJECTED,
          resolvedAt: now,
          comment,
        },
      });
    }

    const updated = await this.prisma.craMonth.update({
      where: { id: craMonthId },
      data: {
        status: PrismaCraStatus.DRAFT,
        rejectionComment: comment,
      },
      include: { mission: true, entries: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_REJECTED_CLIENT',
        resource: `cra_month:${craMonthId}`,
        metadata: { comment },
        initiatorId: clientId,
      },
    });

    await this.notifications.notify(
      craMonth.employeeId,
      'Votre CRA a été refusé par le client',
      `Votre CRA a été refusé par le client : ${comment}`,
    );

    return updated as unknown as CraMonthRow;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async loadCraMonth(craMonthId: string): Promise<CraMonthRow> {
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { id: craMonthId },
      include: { mission: true, entries: true },
    });

    if (craMonth === null) {
      throw new NotFoundException(`CRA month ${craMonthId} not found`);
    }

    return craMonth as unknown as CraMonthRow;
  }
}
