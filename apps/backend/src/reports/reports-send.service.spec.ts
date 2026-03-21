import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@esn/shared-types';
import type { SendReportDto } from './dto/send-report.dto';
import { ReportsSendService } from './reports-send.service';

// ── Prisma mock ──────────────────────────────────────────────────────────────

const mockPrisma = {
  user: { findUnique: vi.fn() },
  mission: { findFirst: vi.fn() },
  craMonth: { findFirst: vi.fn() },
  project: { findMany: vi.fn() },
  projectEntry: { findMany: vi.fn() },
  weatherEntry: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
};

// ── Storage mock ─────────────────────────────────────────────────────────────

const mockStorage = {
  uploadFile: vi.fn(),
};

// ── Notifications mock ───────────────────────────────────────────────────────

const mockNotifications = {
  notifyEmail: vi.fn(),
};

// ── PDF generator mock ───────────────────────────────────────────────────────

const mockPdfGenerator = {
  generate: vi.fn(),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMPLOYEE_ID = 'emp-1';
const MISSION_ID = 'mission-1';
const ESN_ADMIN_ID = 'esn-1';
const CLIENT_ID = 'client-1';

function makeMission(overrides: Record<string, unknown> = {}) {
  return {
    id: MISSION_ID,
    title: 'Mission Alpha',
    employeeId: EMPLOYEE_ID,
    esnAdminId: ESN_ADMIN_ID,
    clientId: CLIENT_ID,
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: null,
    esnAdmin: { id: ESN_ADMIN_ID, firstName: 'Marie', lastName: 'Dir', email: 'marie@esn.com' },
    client: { id: CLIENT_ID, firstName: 'Paul', lastName: 'Client', email: 'paul@client.com' },
    ...overrides,
  };
}

function makeEmployee() {
  return { id: EMPLOYEE_ID, firstName: 'Jean', lastName: 'Dupont', email: 'jean@esn.com' };
}

function makeCraMonth() {
  return {
    id: 'cra-1',
    year: 2026,
    month: 3,
    status: 'SUBMITTED',
    entries: [
      {
        date: new Date('2026-03-02'),
        entryType: 'WORK_ONSITE',
        dayFraction: { toNumber: () => 1 },
        comment: null,
        projectEntries: [{ project: { id: 'proj-1', name: 'Projet Alpha' } }],
      },
    ],
    mission: makeMission(),
  };
}

function makeDto(overrides: Partial<SendReportDto> = {}): SendReportDto {
  return {
    year: 2026,
    month: 3,
    reportType: 'CRA_ONLY',
    recipients: ['ESN', 'CLIENT'],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ReportsSendService.sendMonthlyReport()', () => {
  let service: ReportsSendService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mocks
    mockPrisma.user.findUnique.mockResolvedValue(makeEmployee());
    mockPrisma.mission.findFirst.mockResolvedValue(makeMission());
    mockPrisma.craMonth.findFirst.mockResolvedValue(makeCraMonth());
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'proj-1', name: 'Projet Alpha', status: 'ACTIVE' },
    ]);
    mockPrisma.projectEntry.findMany.mockResolvedValue([]);
    mockPrisma.weatherEntry.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    mockStorage.uploadFile.mockResolvedValue('reports/emp-1/2026/3/CRA_ONLY-123.pdf');
    mockPdfGenerator.generate.mockResolvedValue(Buffer.from('pdf-bytes'));
    mockNotifications.notifyEmail.mockResolvedValue(undefined);

    service = new ReportsSendService(
      mockPrisma as never,
      mockStorage as never,
      mockNotifications as never,
      mockPdfGenerator as never,
    );
  });

  // ── CRA_ONLY — ESN only ───────────────────────────────────────────────────

  it('CRA_ONLY with recipients=[ESN] → calls notifyEmail once (ESN admin)', async () => {
    const result = await service.sendMonthlyReport(
      makeDto({ recipients: ['ESN'] }),
      EMPLOYEE_ID,
      MISSION_ID,
    );

    expect(result.success).toBe(true);
    expect(result.sentTo).toEqual(['ESN']);
    expect(result.skippedRecipients).toEqual([]);
    expect(mockNotifications.notifyEmail).toHaveBeenCalledTimes(1);
    expect(mockNotifications.notifyEmail).toHaveBeenCalledWith(
      ESN_ADMIN_ID,
      expect.stringContaining('Rapport'),
      expect.any(String),
    );
  });

  // ── CRA_WITH_WEATHER — ESN + CLIENT ──────────────────────────────────────

  it('CRA_WITH_WEATHER with recipients=[ESN, CLIENT] → calls notifyEmail twice', async () => {
    mockPrisma.weatherEntry.findMany.mockResolvedValue([
      { date: new Date('2026-03-05'), state: 'SUNNY', comment: null, project: { name: 'Projet Alpha' } },
    ]);

    const result = await service.sendMonthlyReport(
      makeDto({ reportType: 'CRA_WITH_WEATHER', recipients: ['ESN', 'CLIENT'] }),
      EMPLOYEE_ID,
      MISSION_ID,
    );

    expect(result.success).toBe(true);
    expect(result.sentTo).toEqual(expect.arrayContaining(['ESN', 'CLIENT']));
    expect(result.skippedRecipients).toEqual([]);
    expect(mockNotifications.notifyEmail).toHaveBeenCalledTimes(2);
  });

  // ── skippedRecipients: ESN admin null → skip ESN silently ────────────────

  it('esnAdminId null → ESN skipped, CLIENT sent if present', async () => {
    mockPrisma.mission.findFirst.mockResolvedValue(
      makeMission({ esnAdminId: null, esnAdmin: null }),
    );

    const result = await service.sendMonthlyReport(
      makeDto({ recipients: ['ESN', 'CLIENT'] }),
      EMPLOYEE_ID,
      MISSION_ID,
    );

    expect(result.success).toBe(true);
    expect(result.sentTo).toEqual(['CLIENT']);
    expect(result.skippedRecipients).toEqual(['ESN']);
    expect(mockNotifications.notifyEmail).toHaveBeenCalledTimes(1);
    expect(mockNotifications.notifyEmail).toHaveBeenCalledWith(
      CLIENT_ID,
      expect.any(String),
      expect.any(String),
    );
  });

  // ── all recipients skipped → BadRequestException ──────────────────────────

  it('all recipients skipped (esnAdminId=null, clientId=null) → throws BadRequestException', async () => {
    mockPrisma.mission.findFirst.mockResolvedValue(
      makeMission({ esnAdminId: null, esnAdmin: null, clientId: null, client: null }),
    );

    await expect(
      service.sendMonthlyReport(
        makeDto({ recipients: ['ESN', 'CLIENT'] }),
        EMPLOYEE_ID,
        MISSION_ID,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockNotifications.notifyEmail).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  // ── PDF generation fails → no AuditLog ───────────────────────────────────

  it('PDF generation failure → throws and does not create AuditLog', async () => {
    mockPdfGenerator.generate.mockRejectedValue(new Error('puppeteer crash'));

    await expect(
      service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID),
    ).rejects.toThrow('puppeteer crash');

    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  // ── S3 upload fails → no notifyEmail ──────────────────────────────────────

  it('S3 upload failure → throws and does not call notifyEmail', async () => {
    mockStorage.uploadFile.mockRejectedValue(new Error('S3 unreachable'));

    await expect(
      service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID),
    ).rejects.toThrow('S3 unreachable');

    expect(mockNotifications.notifyEmail).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  // ── response shape ────────────────────────────────────────────────────────

  it('response contains pdfS3Key and auditLogId', async () => {
    const s3Key = 'reports/emp-1/2026/3/CRA_ONLY-ts.pdf';
    mockStorage.uploadFile.mockResolvedValue(s3Key);
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-42' });

    const result = await service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID);

    expect(result.pdfS3Key).toBe(s3Key);
    expect(result.auditLogId).toBe('audit-42');
  });

  // ── AuditLog uses REPORT_SENT action ──────────────────────────────────────

  it('creates AuditLog with REPORT_SENT action', async () => {
    await service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: AuditAction.REPORT_SENT }),
      }),
    );
  });

  // ── employee not found ────────────────────────────────────────────────────

  it('employee not found → throws NotFoundException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID),
    ).rejects.toThrow(NotFoundException);
  });

  // ── mission not found ─────────────────────────────────────────────────────

  it('mission not found → throws NotFoundException', async () => {
    mockPrisma.mission.findFirst.mockResolvedValue(null);

    await expect(
      service.sendMonthlyReport(makeDto(), EMPLOYEE_ID, MISSION_ID),
    ).rejects.toThrow(NotFoundException);
  });
});
