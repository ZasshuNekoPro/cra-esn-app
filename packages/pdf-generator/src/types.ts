import { CraEntryType, PortionType, LeaveType } from '@esn/shared-types';

export interface CraPdfData {
  employee: { firstName: string; lastName: string; email: string };
  mission: { title: string; startDate: Date; endDate: Date | null };
  client: { firstName: string; lastName: string } | null;
  year: number;
  month: number; // 1-12
  entries: Array<{
    date: Date;
    entryType: CraEntryType;
    dayFraction: number;
    comment: string | null;
    projects: Array<{ name: string; portion: PortionType | null }>;
  }>;
  summary: {
    totalWorkDays: number;
    totalLeaveDays: number;
    totalSickDays: number;
    workingDaysInMonth: number;
    isOvertime: boolean;
    leaveBalances: Array<{ leaveType: LeaveType; totalDays: number; usedDays: number }>;
  };
  projectsSummary: Array<{ name: string; daysSpent: number }> | null;
  signatures: {
    employee: { signedAt: Date | null; name: string };
    esn: { signedAt: Date | null; name: string };
    client: { signedAt: Date | null; name: string } | null;
  };
}
