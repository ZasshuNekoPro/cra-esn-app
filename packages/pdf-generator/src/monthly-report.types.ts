import type { ReportType } from '@esn/shared-types';

export interface MonthlyReportCraEntry {
  date: Date;
  entryType: string; // CraEntryType value
  dayFraction: number;
  comment: string | null;
  projects: Array<{ name: string }>;
}

export interface MonthlyReportProject {
  projectId: string;
  projectName: string;
  status: string; // ProjectStatus value
}

export interface ProjectWeatherEntry {
  date: Date;
  state: string; // WeatherState value
  comment: string | null;
}

export interface ProjectWeatherData {
  projectName: string;
  entries: ProjectWeatherEntry[];
}

export interface MonthlyReportData {
  employeeName: string;
  esnName: string;
  esnManagerName: string | null;
  clientName: string;
  clientManagerName: string | null;
  year: number;
  month: number; // 1-12
  reportType: ReportType;
  craEntries: MonthlyReportCraEntry[];
  projects: MonthlyReportProject[];
  weatherData?: ProjectWeatherData[]; // only present if reportType === 'CRA_WITH_WEATHER'
}
