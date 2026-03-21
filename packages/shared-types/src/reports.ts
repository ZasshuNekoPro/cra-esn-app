// ─── Reports & Dashboard — shared types ───────────────────────────────────────

// ── Send Report ───────────────────────────────────────────────────────────────

/** Type of PDF report to generate and send. */
export type ReportType = 'CRA_ONLY' | 'CRA_WITH_WEATHER';

/** Recipient party for a sent report. */
export type ReportRecipient = 'ESN' | 'CLIENT';

export interface SendReportRequest {
  year: number;
  month: number; // 1–12
  reportType: ReportType;
  recipients: ReportRecipient[]; // min 1 — enforced by DTO (ArrayMinSize)
}

export interface SendReportResponse {
  success: boolean;
  sentTo: ReportRecipient[];        // recipients that were effectively notified
  pdfS3Key: string;                 // S3 object key for later download
  auditLogId: string;               // ID of the AuditLog row created
  skippedRecipients: ReportRecipient[]; // recipients ignored (null on Mission)
}



import type { CraStatus, WeatherState, MilestoneStatus } from './enums';
import type { LeaveBalanceSummary } from './api';

// ── Monthly Report ────────────────────────────────────────────────────────────

export interface ProjectBreakdownItem {
  projectId: string;
  projectName: string;
  days: number;
}

export interface ReportProjectSummary {
  projectId: string;
  projectName: string;
  latestWeatherState: WeatherState | null;
  milestonesDue: number;
  milestonesLate: number;
}

export interface MonthlyReport {
  employeeId: string;
  employeeName: string;
  missionTitle: string;
  year: number;
  month: number;
  generatedAt: string;           // ISO 8601
  craStatus: CraStatus | null;   // null si aucun CraMonth trouvé
  pdfUrl: string | null;
  totalWorkDays: number;
  totalLeaveDays: number;
  totalSickDays: number;
  totalHolidayDays: number;
  workingDaysInMonth: number;
  isOvertime: boolean;
  projectBreakdown: ProjectBreakdownItem[];
  leaveBalances: LeaveBalanceSummary[];
  projects: ReportProjectSummary[];
}

// ── Project Presentation ──────────────────────────────────────────────────────

export interface WeatherDataPoint {
  date: string;        // ISO date YYYY-MM-DD
  state: WeatherState;
  numericValue: number; // SUNNY=1, CLOUDY=2, RAINY=3, STORM=4 — for recharts
}

export interface DaysByMonth {
  month: string;  // "2026-01"
  days: number;
}

export interface MilestoneItem {
  id: string;
  title: string;
  status: MilestoneStatus;
  dueDate: string | null;
  isLate: boolean;
}

export interface ProjectPresentation {
  projectId: string;
  projectName: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  estimatedDays: number | null;
  from: string | null;           // applied filter start
  to: string | null;             // applied filter end
  weatherHistory: WeatherDataPoint[];
  daysByMonth: DaysByMonth[];
  milestones: MilestoneItem[];
  milestoneDoneCount: number;
  milestoneTotalCount: number;
  totalDaysSpent: number;
}

// ── Dashboard Share ───────────────────────────────────────────────────────────

export interface CreateDashboardShareRequest {
  ttlHours?: number; // default 48, max 168
}

export interface DashboardShareResponse {
  token: string;
  expiresAt: string;
  shareUrl: string;
}

// ── Public Dashboard (unauthenticated view) ───────────────────────────────────

export interface PublicDashboardProject {
  projectId: string;
  projectName: string;
  latestWeatherState: WeatherState | null;
  upcomingMilestones: Array<{ title: string; dueDate: string | null }>;
}

export interface PublicDashboard {
  employeeName: string;
  missionTitle: string;
  currentMonth: {
    year: number;
    month: number;
    totalWorkDays: number;
    craStatus: string;
  } | null;
  projects: PublicDashboardProject[];
  expiresAt: string;
}
