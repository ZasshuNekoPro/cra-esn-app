import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConsentStatus } from '@prisma/client';
import { ConsentService } from '../../../src/consent/consent.service';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { NotificationsService } from '../../../src/notifications/notifications.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employeeId = 'employee-uuid-1';
const esnAdminId = 'esn-admin-uuid-1';
const consentId = 'consent-uuid-1';

const mockConsent = {
  id: consentId,
  employeeId,
  requestedById: esnAdminId,
  scope: ['cra', 'documents'],
  status: ConsentStatus.PENDING,
  grantedAt: null,
  revokedAt: null,
  expiresAt: null,
  createdAt: new Date(),
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  user: { findUnique: vi.fn() },
  consent: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
} as unknown as PrismaService;

// ── Mock Notifications ────────────────────────────────────────────────────────

const mockNotifications = {
  notify: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConsentService(mockPrisma, mockNotifications);
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);
  });

  // ── request ────────────────────────────────────────────────────────────────

  describe('request', () => {
    it('should create a new PENDING consent and notify employee', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: employeeId } as never);
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.consent.create).mockResolvedValue(mockConsent as never);

      const result = await service.request(
        { employeeId, scope: ['cra', 'documents'] },
        esnAdminId,
      );

      expect(mockPrisma.consent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ employeeId, requestedById: esnAdminId, status: ConsentStatus.PENDING }),
        }),
      );
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        employeeId,
        expect.any(String),
        expect.any(String),
      );
      expect(result.status).toBe(ConsentStatus.PENDING);
    });

    it('should throw BadRequestException if a PENDING consent already exists', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: employeeId } as never);
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue(mockConsent as never);

      await expect(
        service.request({ employeeId, scope: ['cra'] }, esnAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should re-request (update to PENDING) if previous consent was REVOKED', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: employeeId } as never);
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      } as never);
      vi.mocked(mockPrisma.consent.update).mockResolvedValue({ ...mockConsent } as never);

      await service.request({ employeeId, scope: ['cra'] }, esnAdminId);
      expect(mockPrisma.consent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ConsentStatus.PENDING }) }),
      );
    });

    it('should throw NotFoundException if employee does not exist', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      await expect(
        service.request({ employeeId, scope: ['cra'] }, esnAdminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── grant ──────────────────────────────────────────────────────────────────

  describe('grant', () => {
    it('should set status to GRANTED and write AuditLog', async () => {
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue(mockConsent as never);
      vi.mocked(mockPrisma.consent.update).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.GRANTED,
        grantedAt: new Date(),
      } as never);

      const result = await service.grant(consentId, employeeId);

      expect(result.status).toBe(ConsentStatus.GRANTED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CONSENT_GRANTED' }),
        }),
      );
    });

    it('should throw ForbiddenException if the requester is not the employee', async () => {
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue(mockConsent as never);

      await expect(service.grant(consentId, 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if consent is not PENDING', async () => {
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.GRANTED,
      } as never);

      await expect(service.grant(consentId, employeeId)).rejects.toThrow(BadRequestException);
    });
  });

  // ── revoke ─────────────────────────────────────────────────────────────────

  describe('revoke', () => {
    it('should set status to REVOKED and write AuditLog', async () => {
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.GRANTED,
      } as never);
      vi.mocked(mockPrisma.consent.update).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      } as never);

      const result = await service.revoke(consentId, employeeId);

      expect(result.status).toBe(ConsentStatus.REVOKED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CONSENT_REVOKED' }),
        }),
      );
    });

    it('should throw BadRequestException if already revoked', async () => {
      vi.mocked(mockPrisma.consent.findUnique).mockResolvedValue({
        ...mockConsent,
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
      } as never);

      await expect(service.revoke(consentId, employeeId)).rejects.toThrow(BadRequestException);
    });
  });

  // ── listForEmployee ────────────────────────────────────────────────────────

  describe('listForEmployee', () => {
    it('should return consents where employeeId matches', async () => {
      vi.mocked(mockPrisma.consent.findMany).mockResolvedValue([mockConsent] as never);

      const result = await service.listForEmployee(employeeId);

      expect(mockPrisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── listForRequester ───────────────────────────────────────────────────────

  describe('listForRequester', () => {
    it('should return consents where requestedById matches', async () => {
      vi.mocked(mockPrisma.consent.findMany).mockResolvedValue([mockConsent] as never);

      const result = await service.listForRequester(esnAdminId);

      expect(mockPrisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { requestedById: esnAdminId } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
