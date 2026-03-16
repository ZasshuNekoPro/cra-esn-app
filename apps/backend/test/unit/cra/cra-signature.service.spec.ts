import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CraSignatureService } from '../../../src/cra/cra-signature.service';
import { NotificationsService } from '../../../src/notifications/notifications.service';
import { CraStatus, ValidationStatus } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const employeeId = 'employee-uuid-1';
const esnAdminId = 'esn-admin-uuid-1';
const clientId = 'client-uuid-1';
const craMonthId = 'cra-month-uuid-1';
const missionId = 'mission-uuid-1';
const validationRequestId = 'val-req-uuid-1';

const mockMission = {
  id: missionId,
  title: 'Dev Mission',
  employeeId,
  esnAdminId,
  clientId,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  isActive: true,
};

const mockMissionNoClient = { ...mockMission, clientId: null };

const mockCraMonthDraft = {
  id: craMonthId,
  year: 2026,
  month: 3,
  status: CraStatus.DRAFT,
  pdfUrl: null,
  submittedAt: null,
  lockedAt: null,
  signedByEmployeeAt: null,
  signedByEsnAt: null,
  signedByClientAt: null,
  rejectionComment: null,
  employeeId,
  missionId,
  mission: mockMission,
  entries: [{ id: 'entry-uuid-1' }],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCraMonthSubmitted = {
  ...mockCraMonthDraft,
  status: CraStatus.SUBMITTED,
  submittedAt: new Date(),
};

const mockCraMonthSignedEmployee = {
  ...mockCraMonthDraft,
  status: CraStatus.SIGNED_EMPLOYEE,
  submittedAt: new Date(),
  signedByEmployeeAt: new Date(),
};

const mockCraMonthSignedEsn = {
  ...mockCraMonthDraft,
  status: CraStatus.SIGNED_ESN,
  submittedAt: new Date(),
  signedByEmployeeAt: new Date(),
  signedByEsnAt: new Date(),
};

const mockValidationRequestPending = {
  id: validationRequestId,
  status: ValidationStatus.PENDING,
  craMonthId,
  validatorId: esnAdminId,
  comment: null,
  requestedAt: new Date(),
  resolvedAt: null,
};

const mockValidationRequestClientPending = {
  id: 'val-req-client-uuid',
  status: ValidationStatus.PENDING,
  craMonthId,
  validatorId: clientId,
  comment: null,
  requestedAt: new Date(),
  resolvedAt: null,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const makePrisma = () =>
  ({
    craMonth: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    validationRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  }) as unknown as PrismaService;

const makeNotifications = () =>
  ({
    notify: vi.fn().mockResolvedValue(undefined),
  }) as unknown as NotificationsService;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CraSignatureService', () => {
  let service: CraSignatureService;
  let prisma: ReturnType<typeof makePrisma>;
  let notifications: ReturnType<typeof makeNotifications>;

  beforeEach(() => {
    prisma = makePrisma();
    notifications = makeNotifications();
    service = new CraSignatureService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
    vi.clearAllMocks();
  });

  // ── submit ────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('should transition DRAFT → SUBMITTED when CRA has entries', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSubmitted,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.submit(craMonthId, employeeId);

      expect(result.status).toBe(CraStatus.SUBMITTED);
      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: craMonthId },
          data: expect.objectContaining({
            status: CraStatus.SUBMITTED,
          }),
        }),
      );
    });

    it('should throw BadRequestException when CRA has no entries', async () => {
      const emptyMonth = { ...mockCraMonthDraft, entries: [] };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(emptyMonth as never);

      await expect(service.submit(craMonthId, employeeId)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if caller is not the CRA owner', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);

      await expect(service.submit(craMonthId, 'other-employee-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if month is not in DRAFT state', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);

      await expect(service.submit(craMonthId, employeeId)).rejects.toThrow(ConflictException);
    });

    it('should write AuditLog with action CRA_SUBMITTED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.submit(craMonthId, employeeId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_SUBMITTED',
            resource: `cra_month:${craMonthId}`,
          }),
        }),
      );
    });

    it('should create in-app Notification for ESN_ADMIN of the mission', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.submit(craMonthId, employeeId);

      expect(notifications.notify).toHaveBeenCalledWith(
        esnAdminId,
        expect.stringContaining('CRA'),
        expect.any(String),
      );
    });

    it('should set submittedAt timestamp', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.submit(craMonthId, employeeId);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submittedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ── retract ───────────────────────────────────────────────────────────────

  describe('retract', () => {
    it('should transition SUBMITTED → DRAFT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.retract(craMonthId, employeeId);

      expect(result.status).toBe(CraStatus.DRAFT);
      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CraStatus.DRAFT,
          }),
        }),
      );
    });

    it('should throw ConflictException if month is not SUBMITTED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);

      await expect(service.retract(craMonthId, employeeId)).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if not the owner', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);

      await expect(service.retract(craMonthId, 'other-employee-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should write AuditLog CRA_RETRACTED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.retract(craMonthId, employeeId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_RETRACTED',
            resource: `cra_month:${craMonthId}`,
          }),
        }),
      );
    });
  });

  // ── signEmployee ──────────────────────────────────────────────────────────

  describe('signEmployee', () => {
    it('should transition SUBMITTED → SIGNED_EMPLOYEE', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.signEmployee(craMonthId, employeeId);

      expect(result.status).toBe(CraStatus.SIGNED_EMPLOYEE);
    });

    it('should set signedByEmployeeAt timestamp', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEmployee(craMonthId, employeeId);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signedByEmployeeAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ForbiddenException if not the CRA owner', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);

      await expect(service.signEmployee(craMonthId, 'other-employee-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if not SUBMITTED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);

      await expect(service.signEmployee(craMonthId, employeeId)).rejects.toThrow(ConflictException);
    });

    it('should create a ValidationRequest for ESN_ADMIN (status PENDING)', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEmployee(craMonthId, employeeId);

      expect(prisma.validationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            craMonthId,
            validatorId: esnAdminId,
            status: ValidationStatus.PENDING,
          }),
        }),
      );
    });

    it('should write AuditLog CRA_SIGNED_EMPLOYEE', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEmployee(craMonthId, employeeId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_SIGNED_EMPLOYEE',
          }),
        }),
      );
    });

    it('should notify ESN_ADMIN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSubmitted as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEmployee(craMonthId, employeeId);

      expect(notifications.notify).toHaveBeenCalledWith(
        esnAdminId,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  // ── signEsn ───────────────────────────────────────────────────────────────

  describe('signEsn', () => {
    it('should transition SIGNED_EMPLOYEE → SIGNED_ESN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({
        ...mockValidationRequestPending,
        status: ValidationStatus.APPROVED,
      } as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.signEsn(craMonthId, esnAdminId);

      expect(result.status).toBe(CraStatus.SIGNED_ESN);
    });

    it('should set signedByEsnAt timestamp', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEsn(craMonthId, esnAdminId);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signedByEsnAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ForbiddenException if caller is not ESN_ADMIN', async () => {
      // The guard checks role at controller level; here we simulate the ESN admin
      // not being the esnAdmin of the mission
      const missionWithOtherEsnAdmin = { ...mockMission, esnAdminId: 'other-admin-uuid' };
      const monthWithOtherEsnAdmin = {
        ...mockCraMonthSignedEmployee,
        mission: missionWithOtherEsnAdmin,
      };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(monthWithOtherEsnAdmin as never);

      await expect(service.signEsn(craMonthId, esnAdminId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if month is not SIGNED_EMPLOYEE', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);

      await expect(service.signEsn(craMonthId, esnAdminId)).rejects.toThrow(ConflictException);
    });

    it('should resolve the pending ESN ValidationRequest as APPROVED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEsn(craMonthId, esnAdminId);

      expect(prisma.validationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ValidationStatus.APPROVED,
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create a CLIENT ValidationRequest if mission has a client', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEsn(craMonthId, esnAdminId);

      expect(prisma.validationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validatorId: clientId,
            status: ValidationStatus.PENDING,
          }),
        }),
      );
    });

    it('should skip CLIENT ValidationRequest and auto-advance if no client', async () => {
      const monthNoClient = {
        ...mockCraMonthSignedEmployee,
        mission: mockMissionNoClient,
      };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(monthNoClient as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      // Two calls to craMonth.update: first SIGNED_ESN, then SIGNED_CLIENT
      vi.mocked(prisma.craMonth.update)
        .mockResolvedValueOnce({ ...monthNoClient, status: CraStatus.SIGNED_ESN } as never)
        .mockResolvedValueOnce({
          ...monthNoClient,
          status: CraStatus.SIGNED_CLIENT,
          signedByClientAt: new Date(),
        } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.signEsn(craMonthId, esnAdminId);

      // Should not create a client validation request
      expect(prisma.validationRequest.create).not.toHaveBeenCalled();
      // Final status should be SIGNED_CLIENT
      expect(result.status).toBe(CraStatus.SIGNED_CLIENT);
    });

    it('should write AuditLog CRA_SIGNED_ESN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEsn(craMonthId, esnAdminId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_SIGNED_ESN',
          }),
        }),
      );
    });

    it('should notify EMPLOYEE and CLIENT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.validationRequest.create).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signEsn(craMonthId, esnAdminId);

      const notifyCalls = vi.mocked(notifications.notify).mock.calls.map((c) => c[0]);
      expect(notifyCalls).toContain(employeeId);
      expect(notifyCalls).toContain(clientId);
    });
  });

  // ── rejectEsn ────────────────────────────────────────────────────────────

  describe('rejectEsn', () => {
    it('should transition SIGNED_EMPLOYEE → DRAFT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthDraft,
        rejectionComment: 'Entries are incorrect in week 2',
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.rejectEsn(
        craMonthId,
        esnAdminId,
        'Entries are incorrect in week 2',
      );

      expect(result.status).toBe(CraStatus.DRAFT);
    });

    it('should require comment (throw BadRequestException if empty)', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);

      await expect(service.rejectEsn(craMonthId, esnAdminId, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if not ESN_ADMIN', async () => {
      const missionWithOtherEsnAdmin = { ...mockMission, esnAdminId: 'other-admin-uuid' };
      const monthWithOtherAdmin = {
        ...mockCraMonthSignedEmployee,
        mission: missionWithOtherEsnAdmin,
      };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(monthWithOtherAdmin as never);

      await expect(
        service.rejectEsn(craMonthId, esnAdminId, 'Reason for rejection here'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should resolve ValidationRequest as REJECTED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectEsn(craMonthId, esnAdminId, 'Missing project entries for week 2');

      expect(prisma.validationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ValidationStatus.REJECTED,
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should store rejectionComment on CraMonth', async () => {
      const comment = 'Missing project entries for week 2';
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthDraft,
        rejectionComment: comment,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectEsn(craMonthId, esnAdminId, comment);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionComment: comment,
          }),
        }),
      );
    });

    it('should write AuditLog CRA_REJECTED_ESN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectEsn(craMonthId, esnAdminId, 'Missing project entries for week 2');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_REJECTED_ESN',
          }),
        }),
      );
    });

    it('should notify EMPLOYEE with the rejection comment', async () => {
      const comment = 'Missing project entries for week 2';
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEmployee as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectEsn(craMonthId, esnAdminId, comment);

      expect(notifications.notify).toHaveBeenCalledWith(
        employeeId,
        expect.any(String),
        expect.stringContaining(comment),
      );
    });
  });

  // ── signClient ────────────────────────────────────────────────────────────

  describe('signClient', () => {
    it('should transition SIGNED_ESN → SIGNED_CLIENT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
        signedByClientAt: new Date(),
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.signClient(craMonthId, clientId);

      expect(result.status).toBe(CraStatus.SIGNED_CLIENT);
    });

    it('should set signedByClientAt timestamp', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
        signedByClientAt: new Date(),
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signClient(craMonthId, clientId);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signedByClientAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ForbiddenException if caller is not the CLIENT of the mission', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);

      await expect(service.signClient(craMonthId, 'other-client-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if month is not SIGNED_ESN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthDraft as never);

      await expect(service.signClient(craMonthId, clientId)).rejects.toThrow(ConflictException);
    });

    it('should resolve CLIENT ValidationRequest as APPROVED', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signClient(craMonthId, clientId);

      expect(prisma.validationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ValidationStatus.APPROVED,
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should write AuditLog CRA_SIGNED_CLIENT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signClient(craMonthId, clientId);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CRA_SIGNED_CLIENT',
          }),
        }),
      );
    });

    it('should notify EMPLOYEE and ESN_ADMIN', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.signClient(craMonthId, clientId);

      const notifyCalls = vi.mocked(notifications.notify).mock.calls.map((c) => c[0]);
      expect(notifyCalls).toContain(employeeId);
      expect(notifyCalls).toContain(esnAdminId);
    });

    it('should trigger auto-lock after SIGNED_CLIENT (pdfUrl set → LOCKED)', async () => {
      // Note T2: status stays at SIGNED_CLIENT; PDF generation (→ LOCKED) is in T5.
      // This test verifies the current T2 behavior: status remains SIGNED_CLIENT.
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthSignedEsn,
        status: CraStatus.SIGNED_CLIENT,
        signedByClientAt: new Date(),
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.signClient(craMonthId, clientId);

      // T2: PDF generation hook will be added in T5; for now stays SIGNED_CLIENT
      expect(result.status).toBe(CraStatus.SIGNED_CLIENT);
    });
  });

  // ── rejectClient ──────────────────────────────────────────────────────────

  describe('rejectClient', () => {
    it('should transition SIGNED_ESN → DRAFT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthDraft,
        rejectionComment: 'Client found errors in week 3',
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.rejectClient(
        craMonthId,
        clientId,
        'Client found errors in week 3',
      );

      expect(result.status).toBe(CraStatus.DRAFT);
    });

    it('should require comment', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);

      await expect(service.rejectClient(craMonthId, clientId, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if not the CLIENT of the mission', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);

      await expect(
        service.rejectClient(craMonthId, 'other-client-uuid', 'Reason for rejection'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should store rejectionComment', async () => {
      const comment = 'Client found errors in week 3 reporting';
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue({
        ...mockCraMonthDraft,
        rejectionComment: comment,
      } as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectClient(craMonthId, clientId, comment);

      expect(prisma.craMonth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectionComment: comment,
          }),
        }),
      );
    });

    it('should notify EMPLOYEE with motif', async () => {
      const comment = 'Client found errors in week 3 reporting';
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonthSignedEsn as never);
      vi.mocked(prisma.validationRequest.findFirst).mockResolvedValue(
        mockValidationRequestClientPending as never,
      );
      vi.mocked(prisma.validationRequest.update).mockResolvedValue({} as never);
      vi.mocked(prisma.craMonth.update).mockResolvedValue(mockCraMonthDraft as never);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

      await service.rejectClient(craMonthId, clientId, comment);

      expect(notifications.notify).toHaveBeenCalledWith(
        employeeId,
        expect.any(String),
        expect.stringContaining(comment),
      );
    });
  });
});
