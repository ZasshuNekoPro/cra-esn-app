import { CraEntryType } from '@esn/shared-types';

/**
 * Format a Date as DD/MM/YYYY (French format)
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a decimal number using French locale (comma as decimal separator)
 * e.g. 1.0 → "1,0", 0.5 → "0,5"
 */
export function formatDecimal(n: number): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 10,
  });
}

/**
 * Return the French label for a CraEntryType
 */
export function entryTypeLabel(type: CraEntryType): string {
  const labels: Record<CraEntryType, string> = {
    [CraEntryType.WORK_ONSITE]: 'Présentiel',
    [CraEntryType.WORK_REMOTE]: 'Télétravail',
    [CraEntryType.WORK_TRAVEL]: 'Déplacement',
    [CraEntryType.LEAVE_CP]: 'Congé payé',
    [CraEntryType.LEAVE_RTT]: 'RTT',
    [CraEntryType.SICK]: 'Maladie',
    [CraEntryType.HOLIDAY]: 'Jour férié',
    [CraEntryType.TRAINING]: 'Formation',
    [CraEntryType.ASTREINTE]: 'Astreinte',
    [CraEntryType.OVERTIME]: 'Heures sup.',
  };
  return labels[type];
}

/**
 * Return the background hex color for a CraEntryType
 */
export function entryTypeColor(type: CraEntryType): string {
  const colors: Record<CraEntryType, string> = {
    [CraEntryType.WORK_ONSITE]: '#d1fae5',
    [CraEntryType.WORK_REMOTE]: '#dbeafe',
    [CraEntryType.WORK_TRAVEL]: '#ede9fe',
    [CraEntryType.LEAVE_CP]: '#fef9c3',
    [CraEntryType.LEAVE_RTT]: '#fef3c7',
    [CraEntryType.SICK]: '#fee2e2',
    [CraEntryType.HOLIDAY]: '#f3f4f6',
    [CraEntryType.TRAINING]: '#f0fdf4',
    [CraEntryType.ASTREINTE]: '#fff7ed',
    [CraEntryType.OVERTIME]: '#fdf4ff',
  };
  return colors[type];
}
