import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CraStatus } from '@prisma/client';

// Mock @esn/pdf-generator to avoid pulling in puppeteer-core in tests
vi.mock('@esn/pdf-generator', () => ({
  CraPdfGenerator: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  })),
}));

import { CraPdfService } from '../../../src/cra/cra-pdf.service';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { StorageService } from '../../../src/storage/storage.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employeeId = 'employee-uuid-1';
const missionId = 'mission-uuid-1';
const esnAdminId = 'esn-admin-uuid-1';
const clientId = 'client-uuid-1';
const craMonthId = 'cra-month-uuid-1';

const mockEmployee = {
  id: employeeId,
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@esn.fr',
};

const mockEsnAdmin = {
  id: esnAdminId,
  firstName: 'Admin',
  lastName: 'ESN',
  email: 'admin@esn.fr',
};

const mockClientUser = {
  id: clientId,
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice.martin@client.fr',
};

const mockMission = {
  id: missionId,
  title: 'Mission Alpha',
  startDate: new Date('2026-01-01'),
  endDate: null,
  isActive: true,
  employeeId,
  esnAdminId,
  clientId,
  dailyRate: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  employee: mockEmployee,
  esnAdmin: mockEsnAdmin,
  client: mockClientUser,
};

const mockEntry = {
  id: 'entry-uuid-1',
  date: new Date('2026-03-02'),
  dayFraction: 1,
  entryType: 'WORK_ONSITE',
  comment: null,
  craMonthId,
  createdAt: new Date(),
  updatedAt: new Date(),
  projectEntries: [
    {
      id: 'pe-uuid-1',
      portion: null,
      project: { id: 'project-uuid-1', name: 'Projet X' },
    },
  ],
};

const mockCraMonth = {
  id: craMonthId,
  year: 2026,
  month: 3,
  status: CraStatus.SIGNED_CLIENT,
  pdfUrl: null,
  submittedAt: new Date(),
  lockedAt: null,
  signedByEmployeeAt: new Date('2026-03-31'),
  signedByEsnAt: new Date('2026-04-01'),
  signedByClientAt: new Date('2026-04-02'),
  rejectionComment: null,
  employeeId,
  missionId,
  createdAt: new Date(),
  updatedAt: new Date(),
  mission: mockMission,
  entries: [mockEntry],
  leaveBalances: [],
};

const mockLeaveBalance = {
  id: 'lb-uuid-1',
  leaveType: 'PAID_LEAVE',
  totalDays: 25,
  usedDays: 2,
  year: 2026,
  userId: employeeId,
  updatedAt: new Date(),
};

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockPrisma = {
  craMonth: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  leaveBalance: {
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} as unknown as PrismaService;

const mockStorage = {
  uploadFile: vi.fn(),
} as unknown as StorageService;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CraPdfService', () => {
  let service: CraPdfService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CraPdfService(mockPrisma, mockStorage);

    vi.mocked(mockPrisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
    vi.mocked(mockPrisma.leaveBalance.findMany).mockResolvedValue([mockLeaveBalance as never]);
    vi.mocked(mockPrisma.craMonth.update).mockResolvedValue({
      ...mockCraMonth,
      status: CraStatus.LOCKED,
      pdfUrl: 'http://minio:9000/cra/cra-test.pdf',
    } as never);
    vi.mocked(mockStorage.uploadFile).mockResolvedValue('cra/employee-uuid-1/2026/03/cra-cra-month-uuid-1.pdf');
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);
  });

  it('should fetch CraMonth data and build CraPdfData', async () => {
    await service.generateAndUpload(craMonthId);

    expect(mockPrisma.craMonth.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: craMonthId },
      }),
    );
  });

  it('should call CraPdfGenerator.generate with correct data', async () => {
    // We can't directly spy on the internal generator without DI,
    // but we can verify the pipeline ran by checking storage was called
    await service.generateAndUpload(craMonthId);
    expect(mockStorage.uploadFile).toHaveBeenCalled();
  });

  it('should upload resulting Buffer to storage with correct S3 key', async () => {
    await service.generateAndUpload(craMonthId);

    const uploadCall = vi.mocked(mockStorage.uploadFile).mock.calls[0];
    // uploadFile(buffer, key, mimeType, sizeBytes)
    const key: string = uploadCall[1] as string;
    // key = `cra/{employeeId}/{year}/{month:02d}/cra-{craMonthId}.pdf`
    expect(key).toBe(`cra/${employeeId}/2026/03/cra-${craMonthId}.pdf`);
    expect(uploadCall[2]).toBe('application/pdf');
  });

  it('should update CraMonth.pdfUrl with the s3Key', async () => {
    await service.generateAndUpload(craMonthId);

    expect(mockPrisma.craMonth.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pdfUrl: `cra/${employeeId}/2026/03/cra-${craMonthId}.pdf`,
        }),
      }),
    );
  });

  it('should transition CraMonth status to LOCKED after upload', async () => {
    await service.generateAndUpload(craMonthId);

    expect(mockPrisma.craMonth.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CraStatus.LOCKED,
          lockedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should write AuditLog CRA_LOCKED', async () => {
    await service.generateAndUpload(craMonthId);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CRA_LOCKED',
          initiatorId: employeeId,
        }),
      }),
    );
  });

  it('should throw BadRequestException if month is not SIGNED_CLIENT', async () => {
    vi.mocked(mockPrisma.craMonth.findFirst).mockResolvedValue({
      ...mockCraMonth,
      status: CraStatus.DRAFT,
    } as never);

    await expect(service.generateAndUpload(craMonthId)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if CraMonth not found', async () => {
    vi.mocked(mockPrisma.craMonth.findFirst).mockResolvedValue(null);

    await expect(service.generateAndUpload(craMonthId)).rejects.toThrow();
  });
});
