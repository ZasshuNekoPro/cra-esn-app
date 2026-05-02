export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

/** Zero-pads a number to 2 digits: 4 → "04" */
export const pad = (n: number): string => String(n).padStart(2, '0');

/** Returns today's date as a local YYYY-MM-DD string (timezone-safe, no UTC shift). */
export const todayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Returns the last day of the given month (1-indexed) as a local YYYY-MM-DD string. */
export const lastDayOfMonthISO = (year: number, month: number): string => {
  const d = new Date(year, month, 0); // day 0 of next month = last day of this month
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Formats year + month (1-indexed) as "YYYY-MM" */
export const formatYearMonth = (year: number, month: number): string =>
  `${year}-${pad(month)}`;
