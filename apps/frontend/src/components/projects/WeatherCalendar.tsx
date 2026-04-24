'use client';

import { WeatherIcon } from './WeatherIcon';
import type { WeatherEntry } from '@esn/shared-types';

interface WeatherCalendarProps {
  year: number;
  month: number; // 1-12
  entries: WeatherEntry[];
  isReadOnly?: boolean;
  onDayClick?: (date: string) => void; // ISO date YYYY-MM-DD
}

const WEEK_DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMondayBasedDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function WeatherCalendar({
  year,
  month,
  entries,
  isReadOnly = false,
  onDayClick,
}: WeatherCalendarProps): JSX.Element {
  const entryByDate = new Map<string, WeatherEntry>();
  for (const entry of entries) {
    const iso = toIsoDate(entry.date instanceof Date ? entry.date : new Date(entry.date));
    if (!entryByDate.has(iso)) {
      entryByDate.set(iso, entry);
    }
  }

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = getMondayBasedDay(firstDay.getDay());

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month - 1, d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-gray-400 py-1">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const iso = toIsoDate(cell.date);
          const entry = entryByDate.get(iso);
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
          const isClickable = !isReadOnly && !isWeekend && onDayClick;

          return (
            <button
              key={iso}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onDayClick(iso)}
              className={[
                'aspect-square flex flex-col items-center justify-center rounded-md border text-xs transition-colors',
                isWeekend ? 'bg-gray-50 text-gray-300 border-gray-100' : 'border-gray-200',
                isClickable ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer' : 'cursor-default',
                entry?.isEscalated ? 'border-orange-400 bg-orange-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={entry?.comment ?? undefined}
            >
              <span className={isWeekend ? 'text-gray-300' : 'text-gray-500'}>
                {cell.date.getDate()}
              </span>
              {entry && (
                <WeatherIcon state={entry.state} size="sm" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
