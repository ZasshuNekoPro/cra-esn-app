import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CraService } from '../../../src/cra/cra.service';
import { CraStatus, CraEntryType, LeaveType } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'employee-uuid-1';
const missionId = 'mission-uuid-1';
const craMonthId = 'cra-month-uuid-1';
const craEntryId = 'cra-entry-uuid-1';

const mockMission = {
  id: missionId,
  title: 'Dev Mission',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  isActive: true,
  employeeId,
  esnAdminId: null,
  clientId: null,
  dailyRate: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCraMonth = {
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
  entries: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCraEntry = {
  id: craEntryId,
  date: new Date('2026-03-03'),
  dayFraction: 1.0,
  entryType: CraEntryType.WORK_ONSITE,
  comment: null,
  craMonthId,
  projectEntries: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLeaveBalance = {
  id: 'lb-uuid-1',
  year: 2026,
  leaveType: LeaveType.PAID_LEAVE,
  totalDays: 25,
  usedDays: 3,
  userId: employeeId,
  updatedAt: new Date(),
};

const makePrisma = () =>
  ({
    craMonth: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    craEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leaveBalance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    publicHoliday: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    mission: {
      findFirst: vi.fn(),
    },
    projectEntry: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  }) as unknown as PrismaService;

const mockEvents = { emit: vi.fn() } as never;

describe('CraService', () => {
  let service: CraService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CraService(prisma as unknown as PrismaService, mockEvents);
    vi.clearAllMocks();
  });

  describe('getOrCreateMonth', () => {
    it('should return existing CraMonth if found', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);

      const result = await service.getOrCreateMonth(employeeId, 2026, 3);

      expect(result).toBeDefined();
      expect(result.id).toBe(craMonthId);
      expect(prisma.craMonth.create).not.toHaveBeenCalled();
    });

    it('should create a new DRAFT CraMonth if none exists', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.mission.findFirst).mockResolvedValue(mockMission as never);
      vi.mocked(prisma.craMonth.create).mockResolvedValue(mockCraMonth as never);

      const result = await service.getOrCreateMonth(employeeId, 2026, 3);

      expect(prisma.craMonth.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            year: 2026,
            month: 3,
            status: CraStatus.DRAFT,
            employeeId,
            missionId,
          }),
        }),
      );
      expect(result.status).toBe(CraStatus.DRAFT);
    });

    it('should link to the active mission of the employee', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.mission.findFirst).mockResolvedValue(mockMission as never);
      vi.mocked(prisma.craMonth.create).mockResolvedValue(mockCraMonth as never);

      await service.getOrCreateMonth(employeeId, 2026, 3);

      expect(prisma.mission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId,
            isActive: true,
          }),
        }),
      );
    });

    it('should throw NotFoundException if employee has no active mission', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValueOnce(null as never);
      vi.mocked(prisma.mission.findFirst).mockResolvedValue(null as never);

      await expect(service.getOrCreateMonth(employeeId, 2026, 3)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createEntry', () => {
    it('should create a WORK_ONSITE entry on a DRAFT month', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(mockCraEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([mockCraEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      const result = await service.createEntry(craMonthId, dto, employeeId);
      expect(result.entry).toBeDefined();
      expect(result.entry.entryType).toBe(CraEntryType.WORK_ONSITE);
    });

    it('should create a half-day entry (dayFraction=0.5)', async () => {
      const halfDayEntry = { ...mockCraEntry, dayFraction: 0.5 };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(halfDayEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([halfDayEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 0.5,
      };

      const result = await service.createEntry(craMonthId, dto, employeeId);
      expect(result.entry.dayFraction).toBe(0.5);
    });

    it('should throw ForbiddenException if month status is not DRAFT', async () => {
      const submittedMonth = { ...mockCraMonth, status: CraStatus.SUBMITTED };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(submittedMonth as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await expect(service.createEntry(craMonthId, dto, employeeId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if entry already exists for that date', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(mockCraEntry as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await expect(service.createEntry(craMonthId, dto, employeeId)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if date is before mission start', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);

      const dto = {
        date: '2025-12-31', // Before mission start (2026-01-01)
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await expect(service.createEntry(craMonthId, dto, employeeId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if date is after mission end', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);

      const dto = {
        date: '2027-01-02', // After mission end (2026-12-31)
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await expect(service.createEntry(craMonthId, dto, employeeId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if date is a weekend', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);

      const dto = {
        date: '2026-03-07', // Saturday
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await expect(service.createEntry(craMonthId, dto, employeeId)).rejects.toThrow(BadRequestException);
    });

    it('should increment LeaveBalance.usedDays when entryType is LEAVE_CP', async () => {
      const leaveEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_CP };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(leaveEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([leaveEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);
      vi.mocked(prisma.leaveBalance.update).mockResolvedValue({ ...mockLeaveBalance, usedDays: 4 } as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.LEAVE_CP,
        dayFraction: 1.0,
      };

      await service.createEntry(craMonthId, dto, employeeId);

      expect(prisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_year_leaveType: expect.objectContaining({
              leaveType: 'PAID_LEAVE',
            }),
          }),
        }),
      );
    });

    it('should increment LeaveBalance.usedDays when entryType is LEAVE_RTT', async () => {
      const rttEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_RTT };
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(rttEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([rttEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue({ ...mockLeaveBalance, leaveType: LeaveType.RTT } as never);
      vi.mocked(prisma.leaveBalance.update).mockResolvedValue({ ...mockLeaveBalance, leaveType: LeaveType.RTT, usedDays: 1 } as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.LEAVE_RTT,
        dayFraction: 1.0,
      };

      await service.createEntry(craMonthId, dto, employeeId);

      expect(prisma.leaveBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_year_leaveType: expect.objectContaining({
              leaveType: 'RTT',
            }),
          }),
        }),
      );
    });

    it('should not change LeaveBalance for WORK_ONSITE entry', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(mockCraEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([mockCraEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      await service.createEntry(craMonthId, dto, employeeId);
      expect(prisma.leaveBalance.update).not.toHaveBeenCalled();
    });

    it('should return isOvertime=true when total exceeds working days', async () => {
      // March 2026 has 22 working days; simulate 23 entries (each 1.0 day)
      const entries = Array.from({ length: 23 }, (_, i) => ({
        ...mockCraEntry,
        id: `entry-${i}`,
        date: new Date(`2026-03-${String(i + 2).padStart(2, '0')}`),
        dayFraction: 1.0,
        entryType: CraEntryType.WORK_ONSITE,
      }));

      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(entries[0] as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue(entries as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);

      const dto = {
        date: '2026-03-24',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      const result = await service.createEntry(craMonthId, dto, employeeId);
      expect(result.isOvertime).toBe(true);
    });

    it('should return isOvertime=false when total is within working days', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.craEntry.create).mockResolvedValue(mockCraEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([mockCraEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);

      const dto = {
        date: '2026-03-03',
        entryType: CraEntryType.WORK_ONSITE,
        dayFraction: 1.0,
      };

      const result = await service.createEntry(craMonthId, dto, employeeId);
      expect(result.isOvertime).toBe(false);
    });
  });

  describe('updateEntry', () => {
    it('should update entryType and recalculate leave balance delta', async () => {
      const existingEntry = { ...mockCraEntry, entryType: CraEntryType.WORK_ONSITE };
      const updatedEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_CP };

      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(existingEntry as never);
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.update).mockResolvedValue(updatedEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([updatedEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);
      vi.mocked(prisma.leaveBalance.update).mockResolvedValue({ ...mockLeaveBalance, usedDays: 4 } as never);

      const dto = { entryType: CraEntryType.LEAVE_CP };
      const result = await service.updateEntry(craMonthId, craEntryId, dto, employeeId);

      expect(result.entry.entryType).toBe(CraEntryType.LEAVE_CP);
      expect(prisma.leaveBalance.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if month is not DRAFT', async () => {
      const existingEntry = { ...mockCraEntry };
      const submittedMonth = { ...mockCraMonth, status: CraStatus.SUBMITTED };

      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(existingEntry as never);
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(submittedMonth as never);

      await expect(
        service.updateEntry(craMonthId, craEntryId, { entryType: CraEntryType.WORK_REMOTE }, employeeId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if entry not found', async () => {
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);

      await expect(
        service.updateEntry(craMonthId, 'nonexistent-id', { entryType: CraEntryType.WORK_REMOTE }, employeeId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should revert old LeaveBalance and apply new one on type change', async () => {
      const existingEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_CP };
      const updatedEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_RTT };

      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(existingEntry as never);
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.update).mockResolvedValue(updatedEntry as never);
      vi.mocked(prisma.craEntry.findMany).mockResolvedValue([updatedEntry] as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);
      vi.mocked(prisma.leaveBalance.update).mockResolvedValue(mockLeaveBalance as never);

      const dto = { entryType: CraEntryType.LEAVE_RTT };
      await service.updateEntry(craMonthId, craEntryId, dto, employeeId);

      // Should be called twice: once to revert LEAVE_CP, once to apply LEAVE_RTT
      expect(prisma.leaveBalance.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry and decrement LeaveBalance if it was a leave entry', async () => {
      const leaveEntry = { ...mockCraEntry, entryType: CraEntryType.LEAVE_CP };

      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(leaveEntry as never);
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(mockCraMonth as never);
      vi.mocked(prisma.craEntry.delete).mockResolvedValue(leaveEntry as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);
      vi.mocked(prisma.leaveBalance.update).mockResolvedValue({ ...mockLeaveBalance, usedDays: 2 } as never);

      await service.deleteEntry(craMonthId, craEntryId, employeeId);

      expect(prisma.craEntry.delete).toHaveBeenCalledWith({ where: { id: craEntryId } });
      expect(prisma.leaveBalance.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if month is not DRAFT', async () => {
      const submittedMonth = { ...mockCraMonth, status: CraStatus.SUBMITTED };

      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(mockCraEntry as never);
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue(submittedMonth as never);

      await expect(service.deleteEntry(craMonthId, craEntryId, employeeId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if entry not found', async () => {
      vi.mocked(prisma.craEntry.findFirst).mockResolvedValue(null as never);

      await expect(service.deleteEntry(craMonthId, 'nonexistent-id', employeeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMonthSummary', () => {
    it('should return totalWorkDays, totalLeaveDays, totalSickDays', async () => {
      const entries = [
        { ...mockCraEntry, entryType: CraEntryType.WORK_ONSITE, dayFraction: 1.0 },
        { ...mockCraEntry, id: 'e2', date: new Date('2026-03-04'), entryType: CraEntryType.LEAVE_CP, dayFraction: 1.0 },
        { ...mockCraEntry, id: 'e3', date: new Date('2026-03-05'), entryType: CraEntryType.SICK, dayFraction: 1.0 },
      ];

      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue({
        ...mockCraMonth,
        entries,
      } as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);

      const result = await service.getMonthSummary(craMonthId, employeeId);

      expect(result.totalWorkDays).toBe(1);
      expect(result.totalLeaveDays).toBe(1);
      expect(result.totalSickDays).toBe(1);
    });

    it('should return workingDaysInMonth from working-days util', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue({
        ...mockCraMonth,
        entries: [],
      } as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);

      const result = await service.getMonthSummary(craMonthId, employeeId);

      // March 2026 = 22 working days (no holidays)
      expect(result.workingDaysInMonth).toBe(22);
    });

    it('should return leaveBalances for PAID_LEAVE and RTT', async () => {
      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue({
        ...mockCraMonth,
        entries: [],
      } as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);

      const result = await service.getMonthSummary(craMonthId, employeeId);

      expect(result.leaveBalances).toBeDefined();
      expect(Array.isArray(result.leaveBalances)).toBe(true);
    });

    it('should set isOvertime=true when work days exceed working days', async () => {
      // March 2026 has 22 working days
      const entries = Array.from({ length: 23 }, (_, i) => ({
        ...mockCraEntry,
        id: `entry-${i}`,
        date: new Date(`2026-03-${String(i + 3).padStart(2, '0')}`),
        dayFraction: 1.0,
        entryType: CraEntryType.WORK_ONSITE,
      }));

      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue({
        ...mockCraMonth,
        entries,
      } as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);

      const result = await service.getMonthSummary(craMonthId, employeeId);
      expect(result.isOvertime).toBe(true);
    });

    it('should include breakdown: onsite, remote, travel', async () => {
      const entries = [
        { ...mockCraEntry, entryType: CraEntryType.WORK_ONSITE, dayFraction: 1.0 },
        { ...mockCraEntry, id: 'e2', date: new Date('2026-03-04'), entryType: CraEntryType.WORK_REMOTE, dayFraction: 1.0 },
        { ...mockCraEntry, id: 'e3', date: new Date('2026-03-05'), entryType: CraEntryType.WORK_TRAVEL, dayFraction: 1.0 },
      ];

      vi.mocked(prisma.craMonth.findFirst).mockResolvedValue({
        ...mockCraMonth,
        entries,
      } as never);
      vi.mocked(prisma.publicHoliday.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.leaveBalance.findUnique).mockResolvedValue(mockLeaveBalance as never);

      const result = await service.getMonthSummary(craMonthId, employeeId);
      expect(result.totalWorkDays).toBe(3); // WORK_ONSITE + WORK_REMOTE + WORK_TRAVEL
    });
  });
});
