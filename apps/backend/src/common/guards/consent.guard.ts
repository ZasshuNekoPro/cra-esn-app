import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, ConsentStatus } from '@esn/shared-types';
import { CONSENT_KEY } from '../decorators/consent-required.decorator';
import { PrismaService } from '../../database/prisma.service';

interface RequestWithUser {
  user: { id: string; role: Role };
  params: Record<string, string>;
  ip?: string;
  headers: Record<string, string>;
}

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramKey = this.reflector.getAllAndOverride<string | null>(CONSENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!paramKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    const employeeId = params[paramKey];

    // Employee accessing their own data — no consent check needed
    if (user.role === Role.EMPLOYEE && user.id === employeeId) {
      return true;
    }

    // All other access to employee data requires active consent
    const consent = await this.prisma.consent.findUnique({
      where: { employeeId_requestedById: { employeeId, requestedById: user.id } },
    });

    const isActive =
      consent !== null &&
      consent.status === ConsentStatus.GRANTED &&
      consent.grantedAt !== null &&
      consent.revokedAt === null;

    if (!isActive) {
      throw new ForbiddenException(
        'Access denied: employee consent is required and has not been granted',
      );
    }

    // Audit trail — required on every consented access
    await this.prisma.auditLog.create({
      data: {
        action: 'CONSENT_ACCESS',
        resource: `employee:${employeeId}`,
        metadata: { consentId: consent.id },
        ipAddress: request.ip ?? null,
        userAgent: request.headers['user-agent'] ?? null,
        initiatorId: user.id,
      },
    });

    return true;
  }
}
