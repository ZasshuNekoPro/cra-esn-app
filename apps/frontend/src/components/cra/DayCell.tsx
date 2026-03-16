'use client';

import { CraEntryType } from '@esn/shared-types';
import type { CraEntry } from '@esn/shared-types';

interface DayCellProps {
  date: Date;
  entry?: CraEntry;
  isWeekend: boolean;
  isHoliday: boolean;
  isDisabled: boolean; // true when month is not DRAFT
  onClick: (date: Date) => void;
}

const ENTRY_TYPE_COLORS: Record<CraEntryType, string> = {
  [CraEntryType.WORK_ONSITE]: 'bg-blue-100',
  [CraEntryType.WORK_REMOTE]: 'bg-cyan-100',
  [CraEntryType.WORK_TRAVEL]: 'bg-sky-100',
  [CraEntryType.LEAVE_CP]: 'bg-yellow-100',
  [CraEntryType.LEAVE_RTT]: 'bg-amber-100',
  [CraEntryType.SICK]: 'bg-orange-100',
  [CraEntryType.HOLIDAY]: 'bg-gray-200',
  [CraEntryType.TRAINING]: 'bg-indigo-100',
  [CraEntryType.ASTREINTE]: 'bg-rose-100',
  [CraEntryType.OVERTIME]: 'bg-red-100',
};

const ENTRY_TYPE_SHORT_LABELS: Record<CraEntryType, string> = {
  [CraEntryType.WORK_ONSITE]: 'Prés',
  [CraEntryType.WORK_REMOTE]: 'TT',
  [CraEntryType.WORK_TRAVEL]: 'Dépl',
  [CraEntryType.LEAVE_CP]: 'CP',
  [CraEntryType.LEAVE_RTT]: 'RTT',
  [CraEntryType.SICK]: 'Mal',
  [CraEntryType.HOLIDAY]: 'Fér',
  [CraEntryType.TRAINING]: 'Form',
  [CraEntryType.ASTREINTE]: 'Ast',
  [CraEntryType.OVERTIME]: 'Sup',
};

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DayCell({
  date,
  entry,
  isWeekend,
  isHoliday,
  isDisabled,
  onClick,
}: DayCellProps): JSX.Element {
  const dayNumber = date.getDate();
  const isoDate = toIsoDate(date);

  // Determine background color
  let bgColor = 'bg-white';
  if (isWeekend || isHoliday) {
    bgColor = 'bg-gray-200';
  } else if (entry) {
    bgColor = ENTRY_TYPE_COLORS[entry.entryType];
  }

  const isClickable = !isDisabled && !isWeekend && !isHoliday;
  const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-default';

  const handleClick = (): void => {
    if (isClickable) {
      onClick(date);
    }
  };

  if (isClickable) {
    return (
      <button
        type="button"
        data-testid="day-cell"
        data-date={isoDate}
        onClick={handleClick}
        className={`relative w-full min-h-[64px] p-1.5 border border-gray-200 rounded text-left transition-colors hover:bg-gray-50 ${bgColor} ${cursorClass}`}
      >
        <span className="text-xs font-semibold text-gray-700">{dayNumber}</span>
        {entry && (
          <div className="mt-0.5">
            <span className="text-xs text-gray-600">
              {ENTRY_TYPE_SHORT_LABELS[entry.entryType]}
            </span>
            {entry.dayFraction === 0.5 && (
              <span className="ml-1 text-xs font-medium text-gray-500">½</span>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      data-testid="day-cell"
      data-date={isoDate}
      className={`relative w-full min-h-[64px] p-1.5 border border-gray-200 rounded ${bgColor} ${cursorClass}`}
    >
      <span
        className={`text-xs font-semibold ${isWeekend || isHoliday ? 'text-gray-400' : 'text-gray-700'}`}
      >
        {dayNumber}
      </span>
      {entry && !isWeekend && !isHoliday && (
        <div className="mt-0.5">
          <span className="text-xs text-gray-500">
            {ENTRY_TYPE_SHORT_LABELS[entry.entryType]}
          </span>
          {entry.dayFraction === 0.5 && (
            <span className="ml-1 text-xs font-medium text-gray-400">½</span>
          )}
        </div>
      )}
      {isHoliday && (
        <div className="mt-0.5">
          <span className="text-xs text-gray-500">Fér</span>
        </div>
      )}
    </div>
  );
}
