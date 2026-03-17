import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConsentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { RequestConsentDto } from './dto/request-consent.dto';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Request (ESN_ADMIN → Employee) ────────────────────────────────────────

  async request(dto: RequestConsentDto, requesterId: string) {
    const employee = await this.prisma.user.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const existing = await this.prisma.consent.findUnique({
      where: { employeeId_requestedById: { employeeId: dto.employeeId, requestedById: requesterId } },
    });

    if (existing) {
      if (existing.status === ConsentStatus.PENDING) {
        throw new BadRequestException('A consent request is already pending for this employee');
      }
      // Revoked/expired → re-request by updating status back to PENDING
      return this.prisma.consent.update({
        where: { id: existing.id },
        data: { status: ConsentStatus.PENDING, scope: dto.scope, revokedAt: null, grantedAt: null },
      });
    }

    const consent = await this.prisma.consent.create({
      data: {
        employeeId: dto.employeeId,
        requestedById: requesterId,
        scope: dto.scope,
        status: ConsentStatus.PENDING,
      },
    });

    // Notify employee in-app
    await this.notifications.notify(
      dto.employeeId,
      'Demande d\'accès à vos données',
      `Un administrateur ESN a demandé l'accès à vos données (${dto.scope.join(', ')}).`,
    );

    return consent;
  }

  // ── Grant (Employee) ──────────────────────────────────────────────────────

  async grant(consentId: string, employeeId: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Consent not found');
    if (consent.employeeId !== employeeId) throw new ForbiddenException('Not your consent to manage');
    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException(`Cannot grant consent in status ${consent.status}`);
    }

    const updated = await this.prisma.consent.update({
      where: { id: consentId },
      data: { status: ConsentStatus.GRANTED, grantedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CONSENT_GRANTED',
        resource: `consent:${consentId}`,
        initiatorId: employeeId,
      },
    });

    return updated;
  }

  // ── Revoke (Employee) ─────────────────────────────────────────────────────

  async revoke(consentId: string, employeeId: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Consent not found');
    if (consent.employeeId !== employeeId) throw new ForbiddenException('Not your consent to manage');
    if (consent.status === ConsentStatus.REVOKED) {
      throw new BadRequestException('Consent is already revoked');
    }

    const updated = await this.prisma.consent.update({
      where: { id: consentId },
      data: { status: ConsentStatus.REVOKED, revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CONSENT_REVOKED',
        resource: `consent:${consentId}`,
        initiatorId: employeeId,
      },
    });

    return updated;
  }

  // ── List for employee (see who has access) ────────────────────────────────

  async listForEmployee(employeeId: string) {
    return this.prisma.consent.findMany({
      where: { employeeId },
      include: { requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── List for ESN admin (see requests they sent) ───────────────────────────

  async listForRequester(requesterId: string) {
    return this.prisma.consent.findMany({
      where: { requestedById: requesterId },
      include: { employee: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
