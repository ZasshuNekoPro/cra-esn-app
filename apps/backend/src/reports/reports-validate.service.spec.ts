import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@esn/shared-types';
import { ReportsValidateService } from './reports-validate.service';

// ── Prisma mock ──────────────────────────────────────────────────────────────

const mockPrisma = {
  reportValidationRequest: {
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  user: { findUnique: vi.fn() },
};

// ── Notifications mock ───────────────────────────────────────────────────────

const mockNotifications = {
  notifyEmail: vi.fn(),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const TOKEN = 'test-uuid-token';
const EMPLOYEE_ID = 'emp-1';
const CALLER_ID = 'caller-esn-admin-1';
const ESN_ID = 'esn-1';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rvr-1',
    token: TOKEN,
    employeeId: EMPLOYEE_ID,
    year: 2026,
    month: 3,
    reportType: 'CRA_ONLY',
    recipient: 'ESN',
    pdfS3Key: 'reports/emp-1/2026/3/CRA_ONLY-ts.pdf',
    status: 'PENDING',
    comment: null,
    resolvedBy: null,
    resolvedAt: null,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    createdAt: new Date(),
    employee: { firstName: 'Jean', lastName: 'Dupont' },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ReportsValidateService', () => {
  let service: ReportsValidateService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(makeRow());
    mockPrisma.reportValidationRequest.update.mockResolvedValue({
      ...makeRow(),
      status: 'VALIDATED',
      resolvedBy: 'Marie Dir',
      resolvedAt: new Date(),
    });
    mockPrisma.reportValidationRequest.count.mockResolvedValue(0);
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
    mockNotifications.notifyEmail.mockResolvedValue(undefined);
    // Default: caller and employee share the same ESN
    mockPrisma.user.findUnique.mockResolvedValue({ esnId: ESN_ID });

    service = new ReportsValidateService(
      mockPrisma as never,
      mockNotifications as never,
    );
  });

  // ── getValidationInfo ──────────────────────────────────────────────────────

  describe('getValidationInfo()', () => {
    it('returns public info for a valid PENDING token', async () => {
      const info = await service.getValidationInfo(TOKEN);

      expect(info.token).toBe(TOKEN);
      expect(info.employeeName).toBe('Jean Dupont');
      expect(info.year).toBe(2026);
      expect(info.month).toBe(3);
      expect(info.reportType).toBe('CRA_ONLY');
      expect(info.recipient).toBe('ESN');
      expect(info.status).toBe('PENDING');
      expect(info.resolvedBy).toBeNull();
      expect(info.resolvedAt).toBeNull();
      expect(info.comment).toBeNull();
    });

    it('throws NotFoundException when token does not exist', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(null);
      await expect(service.getValidationInfo('unknown-token')).rejects.toThrow(NotFoundException);
    });

    it('throws GoneException when status is ARCHIVED', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(makeRow({ status: 'ARCHIVED' }));
      await expect(service.getValidationInfo(TOKEN)).rejects.toThrow(GoneException);
    });

    it('throws GoneException when token is expired (expiresAt in the past)', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.getValidationInfo(TOKEN)).rejects.toThrow(GoneException);
    });
  });

  // ── submitValidation — VALIDATE ────────────────────────────────────────────

  describe('submitValidation() — VALIDATE', () => {
    it('updates status to VALIDATED and returns success', async () => {
      const result = await service.submitValidation(TOKEN, {
        action: 'VALIDATE',
        validatorName: 'Marie Dir',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('VALIDATED');
      expect(mockPrisma.reportValidationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: TOKEN },
          data: expect.objectContaining({ status: 'VALIDATED', resolvedBy: 'Marie Dir' }),
        }),
      );
    });

    it('creates AuditLog with REPORT_VALIDATED action', async () => {
      await service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'Marie Dir' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.REPORT_VALIDATED }),
        }),
      );
    });

    it('notifies the employee after validation', async () => {
      await service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'Marie Dir' });
      expect(mockNotifications.notifyEmail).toHaveBeenCalledWith(
        EMPLOYEE_ID,
        expect.any(String),
        expect.any(String),
      );
    });

    it('sets allValidated=true when no more PENDING/REFUSED requests remain', async () => {
      mockPrisma.reportValidationRequest.count.mockResolvedValue(0);
      const result = await service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'Marie' });
      expect(result.allValidated).toBe(true);
    });

    it('sets allValidated=false when other PENDING requests remain', async () => {
      mockPrisma.reportValidationRequest.count.mockResolvedValue(1);
      const result = await service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'Marie' });
      expect(result.allValidated).toBe(false);
    });
  });

  // ── submitValidation — REFUSE ──────────────────────────────────────────────

  describe('submitValidation() — REFUSE', () => {
    it('updates status to REFUSED when comment is provided', async () => {
      mockPrisma.reportValidationRequest.update.mockResolvedValue({
        ...makeRow(),
        status: 'REFUSED',
        resolvedBy: 'Paul Client',
        comment: 'Données incorrectes',
      });

      const result = await service.submitValidation(TOKEN, {
        action: 'REFUSE',
        validatorName: 'Paul Client',
        comment: 'Données incorrectes',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('REFUSED');
      expect(mockPrisma.reportValidationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REFUSED', comment: 'Données incorrectes' }),
        }),
      );
    });

    it('creates AuditLog with REPORT_REFUSED action', async () => {
      mockPrisma.reportValidationRequest.update.mockResolvedValue({ ...makeRow(), status: 'REFUSED' });
      await service.submitValidation(TOKEN, {
        action: 'REFUSE',
        validatorName: 'Paul',
        comment: 'Erreur',
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.REPORT_REFUSED }),
        }),
      );
    });

    it('throws BadRequestException when REFUSE has no comment', async () => {
      await expect(
        service.submitValidation(TOKEN, { action: 'REFUSE', validatorName: 'Paul' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when REFUSE has empty comment', async () => {
      await expect(
        service.submitValidation(TOKEN, { action: 'REFUSE', validatorName: 'Paul', comment: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Idempotence ───────────────────────────────────────────────────────────

  describe('submitValidation() — idempotence', () => {
    it('returns current status without update when already VALIDATED', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ status: 'VALIDATED', resolvedBy: 'Marie', resolvedAt: new Date() }),
      );

      const result = await service.submitValidation(TOKEN, {
        action: 'VALIDATE',
        validatorName: 'Marie',
      });

      expect(result.status).toBe('VALIDATED');
      expect(mockPrisma.reportValidationRequest.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('returns current status without update when already REFUSED', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ status: 'REFUSED', resolvedBy: 'Paul', comment: 'Erreur' }),
      );

      const result = await service.submitValidation(TOKEN, {
        action: 'REFUSE',
        validatorName: 'Paul',
        comment: 'Erreur',
      });

      expect(result.status).toBe('REFUSED');
      expect(mockPrisma.reportValidationRequest.update).not.toHaveBeenCalled();
    });
  });

  // ── Error cases ────────────────────────────────────────────────────────────

  describe('submitValidation() — error cases', () => {
    it('throws NotFoundException for unknown token', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.submitValidation('bad-token', { action: 'VALIDATE', validatorName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws GoneException for expired token', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(
        service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'X' }),
      ).rejects.toThrow(GoneException);
    });

    it('throws GoneException for ARCHIVED token', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ status: 'ARCHIVED' }),
      );
      await expect(
        service.submitValidation(TOKEN, { action: 'VALIDATE', validatorName: 'X' }),
      ).rejects.toThrow(GoneException);
    });
  });

  // ── archiveValidation ──────────────────────────────────────────────────────

  describe('archiveValidation()', () => {
    it('sets status to ARCHIVED and creates audit log', async () => {
      await service.archiveValidation('rvr-1', CALLER_ID);

      expect(mockPrisma.reportValidationRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rvr-1' },
          data: expect.objectContaining({ status: 'ARCHIVED', resolvedBy: CALLER_ID }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws GoneException when already ARCHIVED', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ status: 'ARCHIVED' }),
      );
      await expect(service.archiveValidation('rvr-1', CALLER_ID)).rejects.toThrow(GoneException);
    });

    it('throws NotFoundException when id does not exist', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(null);
      await expect(service.archiveValidation('unknown-id', CALLER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller belongs to a different ESN', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ esnId: 'esn-other' })  // employee
        .mockResolvedValueOnce({ esnId: ESN_ID });       // caller
      await expect(service.archiveValidation('rvr-1', CALLER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remindEmployee ─────────────────────────────────────────────────────────

  describe('remindEmployee()', () => {
    it('notifies the employee without archiving the request', async () => {
      await service.remindEmployee('rvr-1', CALLER_ID);

      expect(mockPrisma.reportValidationRequest.update).not.toHaveBeenCalled();
      expect(mockNotifications.notifyEmail).toHaveBeenCalledWith(
        EMPLOYEE_ID,
        expect.stringContaining('Rapport'),
        expect.stringContaining('soumettre'),
      );
    });

    it('throws GoneException when request is already ARCHIVED', async () => {
      mockPrisma.reportValidationRequest.findUnique.mockResolvedValue(
        makeRow({ status: 'ARCHIVED' }),
      );
      await expect(service.remindEmployee('rvr-1', CALLER_ID)).rejects.toThrow(GoneException);
    });

    it('throws ForbiddenException when caller belongs to a different ESN', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ esnId: 'esn-other' })
        .mockResolvedValueOnce({ esnId: ESN_ID });
      await expect(service.remindEmployee('rvr-1', CALLER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
