import { describe, it, expect } from 'vitest';
import { countWorkingDays } from '../../../src/cra/utils/working-days.util';

describe('countWorkingDays', () => {
  const noHolidays: Date[] = [];

  it('should count 23 working days in January 2025 (no holidays)', () => {
    // January 2025: 31 days, starts Wednesday
    // Weekends: 4, 5, 11, 12, 18, 19, 25, 26 = 8 days
    // 31 - 8 = 23 working days
    const result = countWorkingDays(2025, 1, noHolidays);
    expect(result).toBe(23);
  });

  it('should exclude Saturdays and Sundays', () => {
    // March 2026: 31 days, starts Sunday
    // Weekends: 1, 7, 8, 14, 15, 21, 22, 28, 29 = 9 days
    // 31 - 9 = 22 working days
    const result = countWorkingDays(2026, 3, noHolidays);
    expect(result).toBe(22);
  });

  it('should exclude a public holiday falling on a weekday', () => {
    // January 2025 = 23 working days normally
    // New Year's Day 2025-01-01 is a Wednesday => 22 working days
    const newYear = new Date('2025-01-01');
    const result = countWorkingDays(2025, 1, [newYear]);
    expect(result).toBe(22);
  });

  it('should not reduce count for a holiday on a weekend', () => {
    // If 2025-01-04 (Saturday) is a holiday, count should not change
    const saturdayHoliday = new Date('2025-01-04');
    const result = countWorkingDays(2025, 1, [saturdayHoliday]);
    expect(result).toBe(23);
  });

  it('should count from mission start when it falls mid-month', () => {
    // January 2025, mission starts Jan 20 (Monday)
    // Jan 20-31: Jan 20(Mon), 21(Tue), 22(Wed), 23(Thu), 24(Fri), 27(Mon), 28(Tue), 29(Wed), 30(Thu), 31(Fri) = 10 days
    const missionStart = new Date('2025-01-20');
    const result = countWorkingDays(2025, 1, noHolidays, missionStart, undefined);
    expect(result).toBe(10);
  });

  it('should count until mission end when it falls mid-month', () => {
    // January 2025, mission ends Jan 10 (Friday)
    // Jan 1(Wed), 2(Thu), 3(Fri), 6(Mon), 7(Tue), 8(Wed), 9(Thu), 10(Fri) = 8 days
    const missionEnd = new Date('2025-01-10');
    const result = countWorkingDays(2025, 1, noHolidays, undefined, missionEnd);
    expect(result).toBe(8);
  });

  it('should return 0 if mission period is entirely outside the month', () => {
    // Mission is entirely in March 2025 while we query February 2025 — no overlap
    const missionStart = new Date('2025-03-01');
    const missionEnd = new Date('2025-03-31');
    const result = countWorkingDays(2025, 2, noHolidays, missionStart, missionEnd);
    expect(result).toBe(0);
  });

  it('should handle February 2024 (leap year — 29 days, 21 working days)', () => {
    // February 2024: 29 days (leap year), starts Thursday
    // Weekends: 3, 4, 10, 11, 17, 18, 24, 25 = 8 days
    // 29 - 8 = 21 working days
    const result = countWorkingDays(2024, 2, noHolidays);
    expect(result).toBe(21);
  });

  it('should handle February 2025 (non-leap — 28 days, 20 working days)', () => {
    // February 2025: 28 days, starts Saturday
    // Weekends: 1, 2, 8, 9, 15, 16, 22, 23 = 8 days
    // 28 - 8 = 20 working days
    const result = countWorkingDays(2025, 2, noHolidays);
    expect(result).toBe(20);
  });
});
