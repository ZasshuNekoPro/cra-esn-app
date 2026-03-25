import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, GoneException } from '@nestjs/common';
import { ReportsService } from '../../../src/reports/reports.service';
import { CraStatus, CraEntryType, WeatherState, MilestoneStatus, PortionType } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employeeId = 'emp-uuid-1';
const missionId = 'mission-uuid-1';
const projectId = 'proj-uuid-1';
const craMonthId = 'cra-month-uuid-1';
const shareToken = 'share-token-uuid-1';

const mockUser = {
  id: employeeId,
  firstName: 'Alice',
  lastName: 'Martin',
};

const mockMission = {
  id: missionId,
  title: 'Mission ACME',
  employeeId,
  startDate: new Date('2026-01-01'),
  endDate: null,
  isActive: true,
};

const mockCraMonth = {
  id: craMonthId,
  year: 2026,
  month: 3,
  status: CraStatus.LOCKED,
  pdfUrl: 'https://s3/cra.pdf',
  employeeId,
  missionId,
  submittedAt: new Date(),
  lockedAt: new Date(),
  signedByEmployeeAt: new Date(),
  signedByEsnAt: new Date(),
  signedByClientAt: new Date(),
  rejectionComment: null,
  mission: { ...mockMission },
  entries: [],
};

const makeEntry = (type: CraEntryType, dayFraction: number, date: string) => ({
  id: `entry-${date}`,
  date: new Date(date),
  entryType: type,
  dayFraction: { toNumber: () => dayFraction },
  comment: null,
  craMonthId,
  projectEntries: [],
});

const mockProject = {
  id: projectId,
  name: 'Projet Alpha',
  description: null,
  startDate: new Date('2026-01-01'),
  endDate: null,
  estimatedDays: 20,
  missionId,
  mission: { employeeId },
  weatherEntries: [],
  milestones: [],
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  user: { findUnique: vi.fn() },
  mission: { findFirst: vi.fn() },
  craMonth: { findFirst: vi.fn() },
  publicHoliday: { findMany: vi.fn() },
  projectEntry: { findMany: vi.fn() },
  project: { findMany: vi.fn(), findFirst: vi.fn() },
  leaveBalance: { findUnique: vi.fn(), findMany: vi.fn() },
  dashboardShare: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportsService(mockPrisma as unknown as PrismaService);
    // Default stubs
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.mission.findFirst.mockResolvedValue(mockMission);
    mockPrisma.publicHoliday.findMany.mockResolvedValue([]);
    mockPrisma.leaveBalance.findUnique.mockResolvedValue(null);
    mockPrisma.leaveBalance.findMany.mockResolvedValue([]);
    mockPrisma.projectEntry.findMany.mockResolvedValue([]);
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  // ── getMonthlyReport ───────────────────────────────────────────────────────

  describe('getMonthlyReport', () => {
    it('returns a zero-entry report when no CraMonth exists', async () => {
      mockPrisma.craMonth.findFirst.mockResolvedValue(null);

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.employeeId).toBe(employeeId);
      expect(report.employeeName).toBe('Alice Martin');
      expect(report.missionTitle).toBe('Mission ACME');
      expect(report.year).toBe(2026);
      expect(report.month).toBe(3);
      expect(report.craStatus).toBeNull();
      expect(report.totalWorkDays).toBe(0);
      expect(report.totalLeaveDays).toBe(0);
      expect(report.totalSickDays).toBe(0);
      expect(report.projectBreakdown).toEqual([]);
    });

    it('throws NotFoundException when employee has no active mission', async () => {
      mockPrisma.craMonth.findFirst.mockResolvedValue(null);
      mockPrisma.mission.findFirst.mockResolvedValue(null);

      await expect(service.getMonthlyReport(employeeId, 2026, 3)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('correctly tallies work, leave, sick and holiday days', async () => {
      const entries = [
        makeEntry(CraEntryType.WORK_ONSITE, 1, '2026-03-03'),
        makeEntry(CraEntryType.WORK_REMOTE, 0.5, '2026-03-04'),
        makeEntry(CraEntryType.LEAVE_CP, 1, '2026-03-05'),
        makeEntry(CraEntryType.LEAVE_RTT, 0.5, '2026-03-06'),
        makeEntry(CraEntryType.SICK, 1, '2026-03-09'),
        makeEntry(CraEntryType.HOLIDAY, 1, '2026-03-10'),
        makeEntry(CraEntryType.TRAINING, 1, '2026-03-11'),
      ];
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries });

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.totalWorkDays).toBeCloseTo(2.5);   // ONSITE + REMOTE + TRAINING
      expect(report.totalLeaveDays).toBeCloseTo(1.5);  // CP + RTT
      expect(report.totalSickDays).toBeCloseTo(1);
      expect(report.totalHolidayDays).toBeCloseTo(1);
    });

    it('flags overtime when worked days exceed working days in month', async () => {
      // March 2026 has 22 working days (Mon-Fri, no holidays); insert 23 work days
      const entries = Array.from({ length: 23 }, (_, i) =>
        makeEntry(CraEntryType.WORK_ONSITE, 1, `2026-03-${String(i + 1).padStart(2, '0')}`),
      );
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries });

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.isOvertime).toBe(true);
    });

    it('aggregates project breakdown from ProjectEntry', async () => {
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries: [] });
      mockPrisma.projectEntry.findMany.mockResolvedValue([
        { projectId, portion: PortionType.FULL, project: { name: 'Projet Alpha' } },
        { projectId, portion: PortionType.HALF_AM, project: { name: 'Projet Alpha' } },
      ]);

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.projectBreakdown).toHaveLength(1);
      expect(report.projectBreakdown[0].projectId).toBe(projectId);
      expect(report.projectBreakdown[0].days).toBeCloseTo(1.5); // FULL=1 + HALF=0.5
    });

    it('includes project weather state in projects summary', async () => {
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries: [] });
      mockPrisma.project.findMany.mockResolvedValue([
        {
          ...mockProject,
          weatherEntries: [{ state: WeatherState.STORM, date: new Date('2026-03-15') }],
          milestones: [],
        },
      ]);

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.projects).toHaveLength(1);
      expect(report.projects[0].latestWeatherState).toBe(WeatherState.STORM);
    });

    it('counts late milestones in projects summary', async () => {
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries: [] });
      const dueDate = new Date('2026-03-01'); // past date
      mockPrisma.project.findMany.mockResolvedValue([
        {
          ...mockProject,
          weatherEntries: [],
          milestones: [
            { status: MilestoneStatus.LATE, dueDate },
            { status: MilestoneStatus.DONE, dueDate: null },
          ],
        },
      ]);

      const report = await service.getMonthlyReport(employeeId, 2026, 3);

      expect(report.projects[0].milestonesLate).toBe(1);
    });
  });

  // ── getProjectPresentation ────────────────────────────────────────────────

  describe('getProjectPresentation', () => {
    it('throws NotFoundException for unknown project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectPresentation(projectId, employeeId),
      ).rejects.toThrow(NotFoundException);
    });

    it('maps weather states to numeric values for recharts', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        ...mockProject,
        weatherEntries: [
          { id: 'w1', date: new Date('2026-03-01'), state: WeatherState.SUNNY },
          { id: 'w2', date: new Date('2026-03-02'), state: WeatherState.STORM },
        ],
        milestones: [],
        entries: [],
      });

      const pres = await service.getProjectPresentation(projectId, employeeId);

      const sunny = pres.weatherHistory.find((w) => w.state === WeatherState.SUNNY);
      const storm = pres.weatherHistory.find((w) => w.state === WeatherState.STORM);
      expect(sunny?.numericValue).toBe(1);
      expect(storm?.numericValue).toBe(4);
    });

    it('aggregates days by month from ProjectEntry', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        ...mockProject,
        weatherEntries: [],
        milestones: [],
        entries: [
          { date: new Date('2026-02-10'), portion: PortionType.FULL },
          { date: new Date('2026-02-11'), portion: PortionType.FULL },
          { date: new Date('2026-03-03'), portion: PortionType.HALF_AM },
        ],
      });

      const pres = await service.getProjectPresentation(projectId, employeeId);

      const feb = pres.daysByMonth.find((d) => d.month === '2026-02');
      const mar = pres.daysByMonth.find((d) => d.month === '2026-03');
      expect(feb?.days).toBeCloseTo(2);
      expect(mar?.days).toBeCloseTo(0.5);
    });

    it('filters weather and entries by date range', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        ...mockProject,
        weatherEntries: [
          { id: 'w1', date: new Date('2026-01-15'), state: WeatherState.CLOUDY },
          { id: 'w2', date: new Date('2026-03-05'), state: WeatherState.RAINY },
        ],
        milestones: [],
        entries: [
          { date: new Date('2026-01-10'), portion: PortionType.FULL },
          { date: new Date('2026-03-10'), portion: PortionType.FULL },
        ],
      });

      const pres = await service.getProjectPresentation(
        projectId,
        employeeId,
        '2026-03-01',
        '2026-03-31',
      );

      expect(pres.weatherHistory).toHaveLength(1);
      expect(pres.weatherHistory[0].state).toBe(WeatherState.RAINY);
      expect(pres.totalDaysSpent).toBeCloseTo(1);
    });
  });

  // ── DashboardShare ────────────────────────────────────────────────────────

  describe('createDashboardShare', () => {
    it('creates a share with 48h default TTL', async () => {
      const now = new Date('2026-03-17T10:00:00Z');
      vi.setSystemTime(now);

      const mockShare = {
        token: shareToken,
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      };
      mockPrisma.dashboardShare.create.mockResolvedValue(mockShare);

      const result = await service.createDashboardShare(employeeId);

      expect(mockPrisma.dashboardShare.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerId: employeeId }),
        }),
      );
      expect(result.token).toBe(shareToken);

      vi.useRealTimers();
    });

    it('caps TTL at 168h', async () => {
      mockPrisma.dashboardShare.create.mockResolvedValue({
        token: shareToken,
        expiresAt: new Date(),
      });

      await service.createDashboardShare(employeeId, 9999);

      const callArg = mockPrisma.dashboardShare.create.mock.calls[0][0];
      const expiresAt: Date = callArg.data.expiresAt;
      const diffHours = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThanOrEqual(168);
    });
  });

  describe('revokeDashboardShare', () => {
    it('throws NotFoundException for unknown token', async () => {
      mockPrisma.dashboardShare.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeDashboardShare('bad-token', employeeId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicDashboard', () => {
    it('throws GoneException for expired token', async () => {
      mockPrisma.dashboardShare.findUnique.mockResolvedValue({
        token: shareToken,
        expiresAt: new Date('2020-01-01'), // past
        revokedAt: null,
        owner: { id: employeeId },
      });

      await expect(service.getPublicDashboard(shareToken)).rejects.toThrow(GoneException);
    });

    it('throws GoneException for revoked token', async () => {
      mockPrisma.dashboardShare.findUnique.mockResolvedValue({
        token: shareToken,
        expiresAt: new Date('2099-01-01'),
        revokedAt: new Date(),
        owner: { id: employeeId },
      });

      await expect(service.getPublicDashboard(shareToken)).rejects.toThrow(GoneException);
    });

    it('throws NotFoundException for non-existent token', async () => {
      mockPrisma.dashboardShare.findUnique.mockResolvedValue(null);

      await expect(service.getPublicDashboard('no-such-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns public dashboard without private data', async () => {
      mockPrisma.dashboardShare.findUnique.mockResolvedValue({
        token: shareToken,
        expiresAt: new Date('2099-01-01'),
        revokedAt: null,
        ownerId: employeeId,
        owner: { id: employeeId, firstName: 'Alice', lastName: 'Martin' },
      });
      mockPrisma.dashboardShare.update.mockResolvedValue({});
      mockPrisma.craMonth.findFirst.mockResolvedValue({ ...mockCraMonth, entries: [] });
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.mission.findFirst.mockResolvedValue(mockMission);

      const dashboard = await service.getPublicDashboard(shareToken);

      expect(dashboard.employeeName).toBe('Alice Martin');
      expect(dashboard.missionTitle).toBe('Mission ACME');
      // Must NOT expose leave balances or private fields
      expect(dashboard).not.toHaveProperty('leaveBalances');
      expect(dashboard).not.toHaveProperty('privateNotes');
      expect(dashboard.expiresAt).toBeDefined();
    });
  });
});
