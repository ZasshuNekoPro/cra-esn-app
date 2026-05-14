import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException, StreamableFile } from '@nestjs/common';
import { ReportsValidateService } from '../../../src/reports/reports-validate.service';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { NotificationsService } from '../../../src/notifications/notifications.service';
import type { StorageService } from '../../../src/storage/storage.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ESN_ID = 'esn-uuid-1';
const EMPLOYEE_ID = 'emp-uuid-1';
const CALLER_ID = 'esn-admin-uuid-1';
const REQUEST_ID = 'req-uuid-1';
const PDF_KEY = 'reports/emp/2026/3/CRA_ONLY-123.pdf';

const mockRow = {
  id: REQUEST_ID,
  token: 'tok-abc',
  employeeId: EMPLOYEE_ID,
  year: 2026,
  month: 3,
  reportType: 'CRA_ONLY',
  recipient: 'ESN',
  pdfS3Key: PDF_KEY,
  status: 'PENDING',
  comment: null,
  resolvedBy: null,
  resolvedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  employee: { firstName: 'Alice', lastName: 'Martin' },
};

// ── Mock factories ────────────────────────────────────────────────────────────

function makePrisma() {
  return {
    reportValidationRequest: {
      findUnique: vi.fn().mockResolvedValue(mockRow),
      update: vi.fn().mockResolvedValue({ ...mockRow, status: 'VALIDATED' }),
      count: vi.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ esnId: ESN_ID }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

function makeNotifications() {
  return { notifyEmail: vi.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
}

function makeStorage(streamOverride?: unknown) {
  const fakeStream = streamOverride ?? { pipe: vi.fn() };
  return {
    getObjectStream: vi.fn().mockResolvedValue(fakeStream),
    getDownloadUrl: vi.fn().mockResolvedValue('https://storage.example.com/key?sig=abc'),
  } as unknown as StorageService;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReportsValidateService.streamValidationPdf', () => {
  let service: ReportsValidateService;
  let prisma: ReturnType<typeof makePrisma>;
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = makePrisma();
    storage = makeStorage();
    service = new ReportsValidateService(prisma, makeNotifications(), storage);
  });

  it('should return a StreamableFile with PDF headers on happy path', async () => {
    const result = await service.streamValidationPdf(REQUEST_ID, CALLER_ID);

    expect(prisma.reportValidationRequest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: REQUEST_ID } }),
    );
    expect(storage.getObjectStream).toHaveBeenCalledWith(PDF_KEY);
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('should throw NotFoundException when validation request does not exist', async () => {
    prisma.reportValidationRequest.findUnique = vi.fn().mockResolvedValue(null);

    await expect(service.streamValidationPdf(REQUEST_ID, CALLER_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(storage.getObjectStream).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when caller belongs to a different ESN', async () => {
    prisma.user.findUnique = vi.fn()
      .mockResolvedValueOnce({ esnId: 'esn-employee' })
      .mockResolvedValueOnce({ esnId: 'esn-other' });

    await expect(service.streamValidationPdf(REQUEST_ID, CALLER_ID)).rejects.toThrow(
      ForbiddenException,
    );
    expect(storage.getObjectStream).not.toHaveBeenCalled();
  });

  it('should propagate storage errors', async () => {
    vi.spyOn(storage, 'getObjectStream').mockRejectedValueOnce(
      new NotFoundException('Object not found: ' + PDF_KEY),
    );

    await expect(service.streamValidationPdf(REQUEST_ID, CALLER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});
