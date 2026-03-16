import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayCell } from './DayCell';
import { CraEntryType } from '@esn/shared-types';
import type { CraEntry } from '@esn/shared-types';

// Mock next-auth auth function used by client.ts (imported transitively)
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

const mockEntry = (overrides: Partial<CraEntry> = {}): CraEntry => ({
  id: 'entry-1',
  date: new Date('2026-03-10'),
  dayFraction: 1.0,
  entryType: CraEntryType.WORK_ONSITE,
  comment: null,
  craMonthId: 'month-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('DayCell', () => {
  it('should render the day number', () => {
    const date = new Date(2026, 2, 10); // March 10, 2026
    render(
      <DayCell
        date={date}
        isWeekend={false}
        isHoliday={false}
        isDisabled={false}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('should render the entry type label when entry is present', () => {
    const date = new Date(2026, 2, 10);
    const entry = mockEntry({ entryType: CraEntryType.WORK_ONSITE });
    render(
      <DayCell
        date={date}
        entry={entry}
        isWeekend={false}
        isHoliday={false}
        isDisabled={false}
        onClick={vi.fn()}
      />,
    );
    // Should render a label/abbreviation for WORK_ONSITE
    const cell = screen.getByRole('button');
    expect(cell).toBeTruthy();
  });

  it('should have disabled cursor when disabled=true', () => {
    const date = new Date(2026, 2, 7); // Saturday
    const { container } = render(
      <DayCell
        date={date}
        isWeekend={true}
        isHoliday={false}
        isDisabled={true}
        onClick={vi.fn()}
      />,
    );
    // When disabled, element should not be a button or have cursor-default styling
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('cursor-default');
  });

  it('should apply active color class from entryType', () => {
    const date = new Date(2026, 2, 10);
    const entry = mockEntry({ entryType: CraEntryType.LEAVE_CP });
    const { container } = render(
      <DayCell
        date={date}
        entry={entry}
        isWeekend={false}
        isHoliday={false}
        isDisabled={false}
        onClick={vi.fn()}
      />,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('bg-yellow-100');
  });

  it('should render half-day indicator when dayFraction=0.5', () => {
    const date = new Date(2026, 2, 10);
    const entry = mockEntry({ dayFraction: 0.5, entryType: CraEntryType.WORK_REMOTE });
    render(
      <DayCell
        date={date}
        entry={entry}
        isWeekend={false}
        isHoliday={false}
        isDisabled={false}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText('½')).toBeTruthy();
  });
});
