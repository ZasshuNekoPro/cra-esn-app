/**
 * Count the number of working days in a given month, optionally constrained
 * by a mission's start/end date. Weekends and public holidays are excluded.
 *
 * @param year             The year (e.g. 2026)
 * @param month            The month 1-12
 * @param publicHolidays   List of public holiday dates
 * @param missionStartDate Optional mission start date (limits from below)
 * @param missionEndDate   Optional mission end date (limits from above)
 * @returns                Number of working days
 */
export function countWorkingDays(
  year: number,
  month: number,
  publicHolidays: Date[],
  missionStartDate?: Date,
  missionEndDate?: Date,
): number {
  // Normalize public holidays to YYYY-MM-DD strings for O(1) lookup
  const holidaySet = new Set(
    publicHolidays.map((h) => toDateString(h)),
  );

  // Inclusive bounds of the month (month is 1-based)
  let from = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0); // day 0 of next month = last day of current month
  let to = lastDayOfMonth;

  // Clamp to mission period if provided
  if (missionStartDate !== undefined && missionStartDate > from) {
    from = stripTime(missionStartDate);
  }
  if (missionEndDate !== undefined && missionEndDate < to) {
    to = stripTime(missionEndDate);
  }

  // If the resulting range is empty or outside the month, return 0
  if (from > to) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(from);

  while (cursor <= to) {
    const day = cursor.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidaySet.has(toDateString(cursor));

    if (!isWeekend && !isHoliday) {
      count++;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

/**
 * Strip time portion from a date (returns a new Date set to midnight local).
 */
function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Return a YYYY-MM-DD string for a date using its local date components.
 */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
