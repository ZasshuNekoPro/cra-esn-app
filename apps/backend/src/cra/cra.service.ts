import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  CraStatus as PrismaCraStatus,
  CraEntryType as PrismaCraEntryType,
  PortionType as PrismaPortionType,
} from '@prisma/client';
import { CraStatus as SharedCraStatus, CraEntryType, LeaveType } from '@esn/shared-types';
import type { CraMonthSummary, LeaveBalanceSummary, CreateCraEntryRequest, UpdateCraEntryRequest } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { countWorkingDays } from './utils/working-days.util';

/** Types returned by Prisma includes */
type CraMonthWithMissionAndEntries = {
  id: string;
  year: number;
  month: number;
  status: PrismaCraStatus;
  pdfUrl: string | null;
  submittedAt: Date | null;
  lockedAt: Date | null;
  signedByEmployeeAt: Date | null;
  signedByEsnAt: Date | null;
  signedByClientAt: Date | null;
  rejectionComment: string | null;
  employeeId: string;
  missionId: string;
  createdAt: Date;
  updatedAt: Date;
  mission: {
    id: string;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    employeeId: string;
    title: string;
  };
  entries: CraEntryRow[];
};

type CraEntryRow = {
  id: string;
  date: Date;
  dayFraction: number | { toNumber: () => number };
  entryType: string;
  comment: string | null;
  craMonthId: string;
  projectEntries: ProjectEntryRow[];
  createdAt: Date;
  updatedAt: Date;
};

type ProjectEntryRow = {
  id: string;
  projectId: string;
  portion: string | null;
};

type CreateEntryResult = {
  entry: NormalizedCraEntry;
  isOvertime: boolean;
};

type UpdateEntryResult = {
  entry: NormalizedCraEntry;
  isOvertime: boolean;
};

type NormalizedCraEntry = {
  id: string;
  date: Date;
  dayFraction: number;
  entryType: CraEntryType;
  comment: string | null;
  craMonthId: string;
  createdAt: Date;
  updatedAt: Date;
};

/** Maps CraEntryType to the corresponding LeaveType for balance tracking */
const ENTRY_TYPE_TO_LEAVE_TYPE: Partial<Record<CraEntryType, LeaveType>> = {
  [CraEntryType.LEAVE_CP]: LeaveType.PAID_LEAVE,
  [CraEntryType.LEAVE_RTT]: LeaveType.RTT,
  [CraEntryType.SICK]: LeaveType.SICK_LEAVE,
};

/** Entry types that count as "work" for overtime detection */
const OVERTIME_COUNTED_TYPES = new Set<CraEntryType>([
  CraEntryType.WORK_ONSITE,
  CraEntryType.WORK_REMOTE,
  CraEntryType.WORK_TRAVEL,
  CraEntryType.ASTREINTE,
  CraEntryType.OVERTIME,
  CraEntryType.TRAINING,
]);

@Injectable()
export class CraService {
  constructor(private readonly prisma: PrismaService) {}

  // ── listMonths ─────────────────────────────────────────────────────────────

  async listMonths(employeeId: string): Promise<CraMonthWithMissionAndEntries[]> {
    const months = await this.prisma.craMonth.findMany({
      where: { employeeId },
      include: { mission: true, entries: { include: { projectEntries: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return months as unknown as CraMonthWithMissionAndEntries[];
  }

  // ── getOrCreateMonth ───────────────────────────────────────────────────────

  async getOrCreateMonth(
    employeeId: string,
    year: number,
    month: number,
  ): Promise<CraMonthWithMissionAndEntries> {
    const existing = await this.prisma.craMonth.findFirst({
      where: { employeeId, year, month },
      include: { mission: true, entries: { include: { projectEntries: true } } },
    });

    if (existing !== null) {
      return existing as unknown as CraMonthWithMissionAndEntries;
    }

    // Find the active mission for this employee
    const mission = await this.prisma.mission.findFirst({
      where: { employeeId, isActive: true },
    });

    if (mission === null) {
      throw new NotFoundException(
        `No active mission found for employee ${employeeId}. Cannot create CRA month.`,
      );
    }

    const created = await this.prisma.craMonth.create({
      data: {
        year,
        month,
        status: PrismaCraStatus.DRAFT,
        employeeId,
        missionId: mission.id,
      },
      include: { mission: true, entries: { include: { projectEntries: true } } },
    });

    return created as unknown as CraMonthWithMissionAndEntries;
  }

  // ── createEntry ────────────────────────────────────────────────────────────

  async createEntry(
    craMonthId: string,
    dto: CreateCraEntryRequest,
    employeeId: string,
  ): Promise<CreateEntryResult> {
    const craMonth = await this.findCraMonthForEmployee(craMonthId, employeeId);

    if (craMonth.status !== PrismaCraStatus.DRAFT) {
      throw new ForbiddenException(
        'CRA entries can only be modified when the month is in DRAFT status.',
      );
    }

    const entryDate = new Date(dto.date);

    // Validate not weekend
    const dayOfWeek = entryDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new BadRequestException(`Date ${dto.date} is a weekend and cannot be used for a CRA entry.`);
    }

    // Validate within mission period
    this.validateDateInMission(entryDate, craMonth.mission);

    // Check uniqueness
    const existingEntry = await this.prisma.craEntry.findFirst({
      where: { craMonthId, date: entryDate },
    });

    if (existingEntry !== null) {
      throw new ConflictException(`A CRA entry already exists for date ${dto.date}.`);
    }

    // Create the entry
    const entry = await this.prisma.craEntry.create({
      data: {
        craMonthId,
        date: entryDate,
        entryType: dto.entryType as PrismaCraEntryType,
        dayFraction: dto.dayFraction,
        comment: dto.comment ?? null,
      },
      include: { projectEntries: true },
    });

    // Create project entries if provided
    if (dto.projectEntries && dto.projectEntries.length > 0) {
      await this.prisma.projectEntry.createMany({
        data: dto.projectEntries.map((pe) => ({
          projectId: pe.projectId,
          portion: pe.portion as PrismaPortionType,
          craEntryId: entry.id,
          date: entryDate,
          employeeId,
        })),
      });
    }

    // Update LeaveBalance if applicable
    await this.applyLeaveBalanceDelta(employeeId, craMonth.year, dto.entryType, Number(dto.dayFraction));

    // Calculate isOvertime
    const isOvertime = await this.calculateIsOvertime(craMonth);

    return {
      entry: normalizeEntry(entry as unknown as CraEntryRow),
      isOvertime,
    };
  }

  // ── updateEntry ────────────────────────────────────────────────────────────

  async updateEntry(
    craMonthId: string,
    entryId: string,
    dto: UpdateCraEntryRequest,
    employeeId: string,
  ): Promise<UpdateEntryResult> {
    const existingEntry = await this.prisma.craEntry.findFirst({
      where: { id: entryId, craMonthId },
      include: { projectEntries: true },
    });

    if (existingEntry === null) {
      throw new NotFoundException(`CRA entry ${entryId} not found.`);
    }

    const craMonth = await this.findCraMonthForEmployee(craMonthId, employeeId);

    if (craMonth.status !== PrismaCraStatus.DRAFT) {
      throw new ForbiddenException(
        'CRA entries can only be modified when the month is in DRAFT status.',
      );
    }

    const oldEntryType = existingEntry.entryType as CraEntryType;
    const newEntryType = dto.entryType ?? oldEntryType;
    const oldDayFraction = toNumber(existingEntry.dayFraction);
    const newDayFraction = dto.dayFraction ?? oldDayFraction;

    // Revert old leave balance if type is changing and old type tracked leaves
    if (dto.entryType !== undefined && dto.entryType !== oldEntryType) {
      await this.revertLeaveBalanceDelta(employeeId, craMonth.year, oldEntryType, oldDayFraction);
      await this.applyLeaveBalanceDelta(employeeId, craMonth.year, newEntryType, newDayFraction);
    } else if (dto.dayFraction !== undefined && dto.dayFraction !== oldDayFraction) {
      // Same type but different fraction — adjust the delta
      const delta = newDayFraction - oldDayFraction;
      if (delta !== 0) {
        await this.applyLeaveBalanceDelta(employeeId, craMonth.year, newEntryType, delta);
      }
    }

    // Update project entries if provided
    if (dto.projectEntries !== undefined) {
      await this.prisma.projectEntry.deleteMany({ where: { craEntryId: entryId } });
      if (dto.projectEntries.length > 0) {
        await this.prisma.projectEntry.createMany({
          data: dto.projectEntries.map((pe) => ({
            projectId: pe.projectId,
            portion: pe.portion as PrismaPortionType,
            craEntryId: entryId,
            date: existingEntry.date,
            employeeId,
          })),
        });
      }
    }

    const updateData: {
      entryType?: PrismaCraEntryType;
      dayFraction?: number;
      comment?: string;
    } = {};
    if (dto.entryType !== undefined) {
      updateData.entryType = dto.entryType as PrismaCraEntryType;
    }
    if (dto.dayFraction !== undefined) {
      updateData.dayFraction = dto.dayFraction;
    }
    if (dto.comment !== undefined) {
      updateData.comment = dto.comment;
    }

    const updated = await this.prisma.craEntry.update({
      where: { id: entryId },
      data: updateData,
      include: { projectEntries: true },
    });

    const isOvertime = await this.calculateIsOvertime(craMonth);

    return {
      entry: normalizeEntry(updated as unknown as CraEntryRow),
      isOvertime,
    };
  }

  // ── deleteEntry ────────────────────────────────────────────────────────────

  async deleteEntry(
    craMonthId: string,
    entryId: string,
    employeeId: string,
  ): Promise<void> {
    const existingEntry = await this.prisma.craEntry.findFirst({
      where: { id: entryId, craMonthId },
    });

    if (existingEntry === null) {
      throw new NotFoundException(`CRA entry ${entryId} not found.`);
    }

    const craMonth = await this.findCraMonthForEmployee(craMonthId, employeeId);

    if (craMonth.status !== PrismaCraStatus.DRAFT) {
      throw new ForbiddenException(
        'CRA entries can only be modified when the month is in DRAFT status.',
      );
    }

    // Revert leave balance if applicable
    await this.revertLeaveBalanceDelta(
      employeeId,
      craMonth.year,
      existingEntry.entryType as CraEntryType,
      toNumber(existingEntry.dayFraction),
    );

    await this.prisma.craEntry.delete({ where: { id: entryId } });
  }

  // ── getMonthSummary ────────────────────────────────────────────────────────

  async getMonthSummary(craMonthId: string, employeeId: string): Promise<CraMonthSummary> {
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { id: craMonthId, employeeId },
      include: {
        mission: true,
        entries: { include: { projectEntries: true } },
      },
    });

    if (craMonth === null) {
      throw new NotFoundException(`CRA month ${craMonthId} not found.`);
    }

    const typedMonth = craMonth as unknown as CraMonthWithMissionAndEntries;

    // Fetch public holidays for this month
    const monthStart = new Date(typedMonth.year, typedMonth.month - 1, 1);
    const monthEnd = new Date(typedMonth.year, typedMonth.month, 0);

    const holidays = await this.prisma.publicHoliday.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        country: 'FR',
      },
    });

    const holidayDates = holidays.map((h) => new Date(h.date));

    const workingDaysInMonth = countWorkingDays(
      typedMonth.year,
      typedMonth.month,
      holidayDates,
      typedMonth.mission.startDate,
      typedMonth.mission.endDate ?? undefined,
    );

    // Calculate totals per category
    let totalWorkDays = 0;
    let totalLeaveDays = 0;
    let totalSickDays = 0;
    let totalHolidayDays = 0;
    let totalOvertimeCountedDays = 0;

    for (const entry of typedMonth.entries) {
      const fraction = toNumber(entry.dayFraction);
      const type = entry.entryType as CraEntryType;

      switch (type) {
        case CraEntryType.WORK_ONSITE:
        case CraEntryType.WORK_REMOTE:
        case CraEntryType.WORK_TRAVEL:
          totalWorkDays += fraction;
          totalOvertimeCountedDays += fraction;
          break;
        case CraEntryType.LEAVE_CP:
        case CraEntryType.LEAVE_RTT:
          totalLeaveDays += fraction;
          break;
        case CraEntryType.SICK:
          totalSickDays += fraction;
          break;
        case CraEntryType.HOLIDAY:
          totalHolidayDays += fraction;
          break;
        case CraEntryType.TRAINING:
        case CraEntryType.ASTREINTE:
        case CraEntryType.OVERTIME:
          totalWorkDays += fraction;
          totalOvertimeCountedDays += fraction;
          break;
        default:
          break;
      }
    }

    const isOvertime = totalOvertimeCountedDays > workingDaysInMonth;

    // Fetch leave balances
    const leaveBalances = await this.getLeaveBalanceSummaries(employeeId, typedMonth.year);

    return {
      craMonthId,
      year: typedMonth.year,
      month: typedMonth.month,
      status: typedMonth.status as unknown as SharedCraStatus,
      totalWorkDays,
      totalLeaveDays,
      totalSickDays,
      totalHolidayDays,
      workingDaysInMonth,
      isOvertime,
      leaveBalances,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findCraMonthForEmployee(
    craMonthId: string,
    employeeId: string,
  ): Promise<CraMonthWithMissionAndEntries> {
    const craMonth = await this.prisma.craMonth.findFirst({
      where: { id: craMonthId, employeeId },
      include: { mission: true, entries: { include: { projectEntries: true } } },
    });

    if (craMonth === null) {
      throw new NotFoundException(`CRA month ${craMonthId} not found.`);
    }

    return craMonth as unknown as CraMonthWithMissionAndEntries;
  }

  private validateDateInMission(
    date: Date,
    mission: CraMonthWithMissionAndEntries['mission'],
  ): void {
    const missionStart = new Date(mission.startDate);
    missionStart.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly < missionStart) {
      throw new BadRequestException(
        `Date ${date.toISOString().slice(0, 10)} is before the mission start date ${missionStart.toISOString().slice(0, 10)}.`,
      );
    }

    if (mission.endDate !== null) {
      const missionEnd = new Date(mission.endDate);
      missionEnd.setHours(23, 59, 59, 999);

      if (dateOnly > missionEnd) {
        throw new BadRequestException(
          `Date ${date.toISOString().slice(0, 10)} is after the mission end date ${new Date(mission.endDate).toISOString().slice(0, 10)}.`,
        );
      }
    }
  }

  private async applyLeaveBalanceDelta(
    employeeId: string,
    year: number,
    entryType: CraEntryType,
    dayFraction: number,
  ): Promise<void> {
    const leaveType = ENTRY_TYPE_TO_LEAVE_TYPE[entryType];
    if (leaveType === undefined) return;

    await this.prisma.leaveBalance.update({
      where: { userId_year_leaveType: { userId: employeeId, year, leaveType } },
      data: { usedDays: { increment: dayFraction } },
    });
  }

  private async revertLeaveBalanceDelta(
    employeeId: string,
    year: number,
    entryType: CraEntryType,
    dayFraction: number,
  ): Promise<void> {
    const leaveType = ENTRY_TYPE_TO_LEAVE_TYPE[entryType];
    if (leaveType === undefined) return;

    await this.prisma.leaveBalance.update({
      where: { userId_year_leaveType: { userId: employeeId, year, leaveType } },
      data: { usedDays: { decrement: dayFraction } },
    });
  }

  private async calculateIsOvertime(craMonth: CraMonthWithMissionAndEntries): Promise<boolean> {
    const allEntries = await this.prisma.craEntry.findMany({
      where: { craMonthId: craMonth.id },
    });

    const holidays = await this.prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(craMonth.year, craMonth.month - 1, 1),
          lte: new Date(craMonth.year, craMonth.month, 0),
        },
        country: 'FR',
      },
    });

    const holidayDates = holidays.map((h) => new Date(h.date));

    const workingDaysInMonth = countWorkingDays(
      craMonth.year,
      craMonth.month,
      holidayDates,
      craMonth.mission.startDate,
      craMonth.mission.endDate ?? undefined,
    );

    let totalCounted = 0;
    for (const entry of allEntries) {
      if (OVERTIME_COUNTED_TYPES.has(entry.entryType as CraEntryType)) {
        totalCounted += toNumber(entry.dayFraction);
      }
    }

    return totalCounted > workingDaysInMonth;
  }

  private async getLeaveBalanceSummaries(
    employeeId: string,
    year: number,
  ): Promise<LeaveBalanceSummary[]> {
    const result: LeaveBalanceSummary[] = [];

    for (const leaveType of [LeaveType.PAID_LEAVE, LeaveType.RTT]) {
      const balance = await this.prisma.leaveBalance.findUnique({
        where: { userId_year_leaveType: { userId: employeeId, year, leaveType } },
      });

      if (balance !== null) {
        const totalDays = toNumber(balance.totalDays);
        const usedDays = toNumber(balance.usedDays);
        result.push({
          leaveType,
          totalDays,
          usedDays,
          remainingDays: totalDays - usedDays,
        });
      }
    }

    return result;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value !== null && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function normalizeEntry(entry: CraEntryRow): NormalizedCraEntry {
  return {
    id: entry.id,
    date: entry.date,
    dayFraction: toNumber(entry.dayFraction),
    entryType: entry.entryType as CraEntryType,
    comment: entry.comment,
    craMonthId: entry.craMonthId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
