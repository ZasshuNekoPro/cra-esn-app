export { CraPdfGenerator } from './cra-pdf.generator';
export type { CraPdfData } from './types';
export { buildCraHtml } from './templates/cra.template';
export { formatDate, formatDecimal, entryTypeLabel, entryTypeColor } from './utils/format.util';

export { MonthlyReportPdfGenerator } from './monthly-report.generator';
export type { MonthlyReportData, MonthlyReportCraEntry, MonthlyReportProject, ProjectWeatherData, ProjectWeatherEntry } from './monthly-report.types';
export { buildMonthlyReportHtml } from './templates/monthly-report.template';
