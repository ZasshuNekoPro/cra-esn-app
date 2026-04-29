import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ValidationsService } from '../../../src/projects/validations.service';
import { ValidationStatus, Role } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'employee-uuid-1';
const esnAdminId = 'esnadmin-uuid-1';
const projectId = 'project-uuid-1';
const validationId = 'validation-uuid-1';

const mockValidation = {
  id: validationId,
  title: 'Revue code sprint 1',
  description: 'Validation du livrable sprint 1',
  targetRole: Role.ESN_ADMIN,
  status: ValidationStatus.PENDING,
  decisionComment: null,
  requestedAt: new Date(),
  resolvedAt: null,
  projectId,
  requestedById: employeeId,
  resolverId: null,
  createdAt: new Date(),
};

const mockPrisma = {
  projectValidationRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  project: {
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('ValidationsService', () => {
  let service: ValidationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ValidationsService(mockPrisma);
  });

  describe('createValidation', () => {
    it('should create a validation request on an owned project', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue({ id: projectId } as never);
      vi.mocked(mockPrisma.projectValidationRequest.create).mockResolvedValue(mockValidation as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.createValidation(projectId, employeeId, {
        title: 'Revue code sprint 1',
        description: 'Validation du livrable sprint 1',
        targetRole: Role.ESN_ADMIN,
      });

      expect(result.title).toBe('Revue code sprint 1');
      expect(mockPrisma.projectValidationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId, requestedById: employeeId }),
        }),
      );
    });

    it('should throw NotFoundException if project not owned', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(null);

      await expect(
        service.createValidation('unknown', employeeId, {
          title: 'X',
          description: 'Y',
          targetRole: Role.ESN_ADMIN,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should write audit log on creation', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue({ id: projectId } as never);
      vi.mocked(mockPrisma.projectValidationRequest.create).mockResolvedValue(mockValidation as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      await service.createValidation(projectId, employeeId, {
        title: 'X',
        description: 'Y',
        targetRole: Role.ESN_ADMIN,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getValidations', () => {
    it('should return validation requests for a project', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findMany).mockResolvedValue([mockValidation] as never);

      const results = await service.getValidations(projectId);
      expect(results).toHaveLength(1);
      expect(mockPrisma.projectValidationRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId } }),
      );
    });
  });

  describe('approveValidation', () => {
    it('should set status to APPROVED when ESN_ADMIN approves ESN_ADMIN-targeted validation', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(mockValidation as never);
      vi.mocked(mockPrisma.projectValidationRequest.update).mockResolvedValue({
        ...mockValidation,
        status: ValidationStatus.APPROVED,
        resolvedAt: new Date(),
        resolverId: esnAdminId,
      } as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.approveValidation(validationId, esnAdminId, Role.ESN_ADMIN, {});
      expect(result.status).toBe(ValidationStatus.APPROVED);
    });

    it('should throw ForbiddenException when CLIENT tries to approve ESN_ADMIN-targeted validation', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(mockValidation as never);

      await expect(
        service.approveValidation(validationId, 'client-uuid', Role.CLIENT, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow CLIENT to approve CLIENT-targeted validation', async () => {
      const clientTargeted = { ...mockValidation, targetRole: Role.CLIENT };
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(clientTargeted as never);
      vi.mocked(mockPrisma.projectValidationRequest.update).mockResolvedValue({
        ...clientTargeted,
        status: ValidationStatus.APPROVED,
      } as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.approveValidation(validationId, 'client-uuid', Role.CLIENT, {});
      expect(result.status).toBe(ValidationStatus.APPROVED);
    });

    it('should throw ForbiddenException when ESN_ADMIN tries to approve CLIENT-targeted validation', async () => {
      const clientTargeted = { ...mockValidation, targetRole: Role.CLIENT };
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(clientTargeted as never);

      await expect(
        service.approveValidation(validationId, esnAdminId, Role.ESN_ADMIN, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if validation not found', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(null);

      await expect(
        service.approveValidation('nonexistent', esnAdminId, Role.ESN_ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if validation is not PENDING', async () => {
      const approved = { ...mockValidation, status: ValidationStatus.APPROVED };
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(approved as never);

      await expect(
        service.approveValidation(validationId, esnAdminId, Role.ESN_ADMIN, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejectValidation', () => {
    it('should set status to REJECTED', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(mockValidation as never);
      vi.mocked(mockPrisma.projectValidationRequest.update).mockResolvedValue({
        ...mockValidation,
        status: ValidationStatus.REJECTED,
        resolvedAt: new Date(),
        resolverId: esnAdminId,
        decisionComment: 'Pas complet',
      } as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.rejectValidation(validationId, esnAdminId, Role.ESN_ADMIN, {
        decisionComment: 'Pas complet',
      });
      expect(result.status).toBe(ValidationStatus.REJECTED);
    });

    it('should throw ForbiddenException when CLIENT tries to reject ESN_ADMIN-targeted validation', async () => {
      vi.mocked(mockPrisma.projectValidationRequest.findFirst).mockResolvedValue(mockValidation as never);

      await expect(
        service.rejectValidation(validationId, 'client-uuid', Role.CLIENT, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
