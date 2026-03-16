'use client';

import type { CraEntry } from '@esn/shared-types';
import { DayCell } from './DayCell';

interface MonthGridProps {
  year: number;
  month: number; // 1-12
  entries: CraEntry[];
  publicHolidayDates: string[]; // ISO date strings YYYY-MM-DD
  isReadOnly: boolean;
  onDayClick: (date: Date) => void;
}

const WEEK_DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the Monday-based day index (0=Monday, 6=Sunday)
 * for a given JS Date.getDay() value (0=Sunday, 1=Monday, ..., 6=Saturday).
 */
function getMondayBasedDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function MonthGrid({
  year,
  month,
  entries,
  publicHolidayDates,
  isReadOnly,
  onDayClick,
}: MonthGridProps): JSX.Element {
  // Build entries map by ISO date
  const entryByDate = new Map<string, CraEntry>();
  for (const entry of entries) {
    const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
    entryByDate.set(toIsoDate(d), entry);
  }

  // Public holidays set
  const holidaySet = new Set<string>(publicHolidayDates);

  // First day of the month
  const firstDay = new Date(year, month - 1, 1);
  // Last day of the month
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();

  // Monday-based offset for the first day
  const startOffset = getMondayBasedDay(firstDay.getDay());

  // Build grid cells: padding cells + month days + trailing padding
  interface GridCell {
    date: Date;
    isCurrentMonth: boolean;
  }

  const cells: GridCell[] = [];

  // Padding cells from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, -i);
    cells.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month - 1, day), isCurrentMonth: true });
  }

  // Trailing cells to complete the last week
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month, i), isCurrentMonth: false });
  }

  // Split into weeks
  const weeks: GridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="w-full">
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((cell) => {
            if (!cell.isCurrentMonth) {
              // Out-of-month padding cell
              return (
                <div
                  key={toIsoDate(cell.date)}
                  className="min-h-[64px] p-1.5 border border-gray-100 rounded bg-gray-50"
                >
                  <span className="text-xs text-gray-300">{cell.date.getDate()}</span>
                </div>
              );
            }

            const isoDate = toIsoDate(cell.date);
            const jsDay = cell.date.getDay();
            const isWeekend = jsDay === 0 || jsDay === 6;
            const isHoliday = holidaySet.has(isoDate);
            const entry = entryByDate.get(isoDate);
            const isDisabled = isReadOnly || isWeekend || isHoliday;

            return (
              <DayCell
                key={isoDate}
                date={cell.date}
                entry={entry}
                isWeekend={isWeekend}
                isHoliday={isHoliday}
                isDisabled={isDisabled}
                onClick={onDayClick}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
