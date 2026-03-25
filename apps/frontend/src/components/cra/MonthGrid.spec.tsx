import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MonthGrid } from './MonthGrid';
import { CraEntryType } from '@esn/shared-types';
import type { CraEntry } from '@esn/shared-types';

// Mock next-auth
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

const makeEntry = (dateStr: string, type: CraEntryType, dayFraction = 1.0): CraEntry => ({
  id: `entry-${dateStr}`,
  date: new Date(dateStr),
  dayFraction,
  entryType: type,
  comment: null,
  craMonthId: 'month-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('MonthGrid', () => {
  it('should render correct number of days for a 31-day month', () => {
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    // March 2026 has 31 days — verify by counting data-testid cells with dates in March 2026
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const marchCells = Array.from(dayCells).filter((el) => {
      const date = el.getAttribute('data-date') ?? '';
      return date.startsWith('2026-03-');
    });
    expect(marchCells.length).toBe(31);
    // Verify first and last day present
    const firstDay = Array.from(dayCells).find((el) => el.getAttribute('data-date') === '2026-03-01');
    const lastDay = Array.from(dayCells).find((el) => el.getAttribute('data-date') === '2026-03-31');
    expect(firstDay).toBeTruthy();
    expect(lastDay).toBeTruthy();
  });

  it('should render correct number of days for February (28 days, non-leap)', () => {
    const { container } = render(
      <MonthGrid
        year={2025}
        month={2}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const febCells = Array.from(dayCells).filter((el) => {
      const date = el.getAttribute('data-date') ?? '';
      return date.startsWith('2025-02-');
    });
    expect(febCells.length).toBe(28);
    // Day 29 should NOT appear as a current-month cell
    const day29 = Array.from(dayCells).find((el) => el.getAttribute('data-date') === '2025-02-29');
    expect(day29).toBeUndefined();
  });

  it('should render correct number of days for February (29 days, leap year)', () => {
    const { container } = render(
      <MonthGrid
        year={2024}
        month={2}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const febCells = Array.from(dayCells).filter((el) => {
      const date = el.getAttribute('data-date') ?? '';
      return date.startsWith('2024-02-');
    });
    expect(febCells.length).toBe(29);
    const day29 = Array.from(dayCells).find((el) => el.getAttribute('data-date') === '2024-02-29');
    expect(day29).toBeTruthy();
  });

  it('should mark Saturday cells as disabled weekend', () => {
    // March 2026: 7th is a Saturday
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    // The grid renders day cells; weekend cells should have cursor-default
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    // Find cell for day 7 (Saturday)
    const saturdayCells = Array.from(dayCells).filter(
      (el) => el.getAttribute('data-date') === '2026-03-07',
    );
    expect(saturdayCells.length).toBe(1);
    expect(saturdayCells[0].className).toContain('cursor-default');
  });

  it('should mark Sunday cells as disabled weekend', () => {
    // March 2026: 8th is a Sunday
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const sundayCells = Array.from(dayCells).filter(
      (el) => el.getAttribute('data-date') === '2026-03-08',
    );
    expect(sundayCells.length).toBe(1);
    expect(sundayCells[0].className).toContain('cursor-default');
  });

  it('should apply WORK_ONSITE color class to filled WORK_ONSITE entries', () => {
    const entries = [makeEntry('2026-03-10', CraEntryType.WORK_ONSITE)];
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={entries}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const workDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-10',
    );
    expect(workDay).toBeTruthy();
    expect(workDay!.className).toContain('bg-blue-100');
  });

  it('should apply LEAVE_CP color class to leave entries', () => {
    const entries = [makeEntry('2026-03-11', CraEntryType.LEAVE_CP)];
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={entries}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const leaveDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-11',
    );
    expect(leaveDay).toBeTruthy();
    expect(leaveDay!.className).toContain('bg-yellow-100');
  });

  it('should apply HOLIDAY color class to public holiday entries', () => {
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={['2026-03-16']}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const holidayDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-16',
    );
    expect(holidayDay).toBeTruthy();
    expect(holidayDay!.className).toContain('bg-gray-200');
  });

  it('should not call onDayClick for weekend cells', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={handleClick}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const saturdayCell = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-07',
    ) as HTMLElement | undefined;
    if (saturdayCell) {
      fireEvent.click(saturdayCell);
    }
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not call onDayClick when isReadOnly=true', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={true}
        onDayClick={handleClick}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const workDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-10',
    ) as HTMLElement | undefined;
    if (workDay) {
      fireEvent.click(workDay);
    }
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should call onDayClick with correct date when clicked in editable mode', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={handleClick}
      />,
    );
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const workDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-10',
    ) as HTMLElement | undefined;
    if (workDay) {
      fireEvent.click(workDay);
    }
    expect(handleClick).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const calledDate = handleClick.mock.calls[0][0] as Date;
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(2); // 0-indexed
    expect(calledDate.getDate()).toBe(10);
  });

  it('should show empty state styling for unfilled working days', () => {
    const { container } = render(
      <MonthGrid
        year={2026}
        month={3}
        entries={[]}
        publicHolidayDates={[]}
        isReadOnly={false}
        onDayClick={vi.fn()}
      />,
    );
    // Tuesday March 10, 2026 is a weekday with no entry
    const dayCells = container.querySelectorAll('[data-testid="day-cell"]');
    const emptyWorkDay = Array.from(dayCells).find(
      (el) => el.getAttribute('data-date') === '2026-03-10',
    );
    expect(emptyWorkDay).toBeTruthy();
    // Should have hover styling indicating it's clickable
    expect(emptyWorkDay!.className).toContain('hover:brightness-95');
  });
});
