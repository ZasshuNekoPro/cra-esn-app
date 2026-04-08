export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

/** Zero-pads a number to 2 digits: 4 → "04" */
export const pad = (n: number): string => String(n).padStart(2, '0');

/** Returns today's date as an ISO string YYYY-MM-DD */
export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Formats year + month (1-indexed) as "YYYY-MM" */
export const formatYearMonth = (year: number, month: number): string =>
  `${year}-${pad(month)}`;
