import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ValidationStatus, AuditAction, Role } from '@esn/shared-types';
import type { CreateProjectValidationRequest, DecideValidationRequest } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ValidationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createValidation(projectId: string, callerId: string, dto: CreateProjectValidationRequest) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, mission: { employeeId: callerId } },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable ou accès non autorisé');
    }

    const validation = await this.prisma.projectValidationRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        targetRole: dto.targetRole as never,
        projectId,
        requestedById: callerId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.VALIDATION_REQUESTED,
        resource: `project:${projectId}`,
        metadata: { validationId: validation.id, targetRole: dto.targetRole },
        initiatorId: callerId,
      },
    });

    return validation;
  }

  async getValidations(projectId: string) {
    return this.prisma.projectValidationRequest.findMany({
      where: { projectId },
      orderBy: { requestedAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        resolver: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async approveValidation(validationId: string, callerId: string, callerRole: Role, dto: DecideValidationRequest) {
    const validation = await this.prisma.projectValidationRequest.findFirst({
      where: { id: validationId },
    });

    if (!validation) {
      throw new NotFoundException('Demande de validation introuvable');
    }

    if ((validation.status as unknown as ValidationStatus) !== ValidationStatus.PENDING) {
      throw new ForbiddenException('Cette demande a déjà été traitée');
    }

    const targetRole = validation.targetRole as unknown as Role;
    const authorized =
      (targetRole === Role.ESN_ADMIN && (callerRole === Role.ESN_ADMIN || callerRole === Role.ESN_MANAGER)) ||
      (targetRole === Role.CLIENT && callerRole === Role.CLIENT);
    if (!authorized) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à décider cette validation');
    }

    const updated = await this.prisma.projectValidationRequest.update({
      where: { id: validationId },
      data: {
        status: ValidationStatus.APPROVED as never,
        resolvedAt: new Date(),
        resolverId: callerId,
        ...(dto.decisionComment !== undefined && { decisionComment: dto.decisionComment }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.VALIDATION_APPROVED,
        resource: `project:${validation.projectId}`,
        metadata: { validationId },
        initiatorId: callerId,
      },
    });

    return updated;
  }

  async rejectValidation(validationId: string, callerId: string, callerRole: Role, dto: DecideValidationRequest) {
    const validation = await this.prisma.projectValidationRequest.findFirst({
      where: { id: validationId },
    });

    if (!validation) {
      throw new NotFoundException('Demande de validation introuvable');
    }

    if ((validation.status as unknown as ValidationStatus) !== ValidationStatus.PENDING) {
      throw new ForbiddenException('Cette demande a déjà été traitée');
    }

    const targetRole = validation.targetRole as unknown as Role;
    const authorized =
      (targetRole === Role.ESN_ADMIN && (callerRole === Role.ESN_ADMIN || callerRole === Role.ESN_MANAGER)) ||
      (targetRole === Role.CLIENT && callerRole === Role.CLIENT);
    if (!authorized) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à décider cette validation');
    }

    const updated = await this.prisma.projectValidationRequest.update({
      where: { id: validationId },
      data: {
        status: ValidationStatus.REJECTED as never,
        resolvedAt: new Date(),
        resolverId: callerId,
        ...(dto.decisionComment !== undefined && { decisionComment: dto.decisionComment }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.VALIDATION_REJECTED,
        resource: `project:${validation.projectId}`,
        metadata: { validationId },
        initiatorId: callerId,
      },
    });

    return updated;
  }
}
