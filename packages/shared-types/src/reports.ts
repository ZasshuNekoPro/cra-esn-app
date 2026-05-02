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
  validationTtlHours?: number;   // 24 | 48 | 72 | 168 — defaults to 48 on backend
}

export interface SendReportResponse {
  success: boolean;
  sentTo: ReportRecipient[];        // recipients that were effectively notified
  pdfS3Key: string;                 // S3 object key for later download
  auditLogId: string;               // ID of the AuditLog row created
  skippedRecipients: ReportRecipient[]; // recipients ignored (null on Mission)
}

// ── Report Validation Pipeline ────────────────────────────────────────────────

/** Status of a report validation request. */
export type ReportValidationStatus = 'PENDING' | 'VALIDATED' | 'REFUSED' | 'ARCHIVED';

/** One validation request (per recipient) attached to a sent report. */
export interface ReportValidationItem {
  id: string;
  token: string;
  recipient: ReportRecipient;
  status: ReportValidationStatus;
  comment: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;  // ISO 8601
  expiresAt: string;           // ISO 8601
  createdAt: string;           // ISO 8601
}

/** Extended validation item with employee context — returned by GET /reports/for-esn */
export interface ReportValidationItemForEsn extends ReportValidationItem {
  year: number;
  month: number;
  reportType: ReportType;
  employeeId: string;
  employeeName: string;
}

/** Public context returned by GET /reports/validate/:token (no auth required). */
export interface ValidateReportPublicInfo {
  token: string;
  employeeName: string;
  year: number;
  month: number;
  reportType: ReportType;
  recipient: ReportRecipient;
  status: ReportValidationStatus;
  expiresAt: string;            // ISO 8601
  resolvedBy: string | null;
  resolvedAt: string | null;
  comment: string | null;
}

/** Body for POST /reports/validate/:token. */
export interface ValidateReportRequest {
  action: 'VALIDATE' | 'REFUSE';
  validatorName: string;
  comment?: string;             // required when action === 'REFUSE'
}

/** Response body for POST /reports/validate/:token. */
export interface ValidateReportResponse {
  success: boolean;
  status: ReportValidationStatus;
  allValidated: boolean;        // true when every sentTo recipient is VALIDATED
}

/** Available TTL options for validation links (hours). */
export type SendReportTtlHours = 24 | 48 | 72 | 168;

// ── Validation CRA Preview ────────────────────────────────────────────────────

export interface ValidationCraPreviewEntry {
  date: string;        // ISO 8601
  entryType: string;   // CraEntryType value
  dayFraction: number;
  modifiers: string[]; // CraEntryModifier values
  secondHalfType: string | null; // CraEntryType when dayFraction === 0.5
  comment: string | null;
}

export interface ValidationWeatherEntry {
  date: string;        // ISO 8601
  state: string;       // WeatherState value
  projectName: string;
  comment: string | null;
}

export interface ValidationCraPreview {
  year: number;
  month: number;
  reportType: string;  // ReportType value
  craEntries: ValidationCraPreviewEntry[];
  weatherEntries: ValidationWeatherEntry[];
}

/** Presigned download URL returned by GET /reports/sent-history/:id/download. */
export interface ReportDownloadResponse {
  url: string;                  // presigned S3 URL (TTL: 300s)
}

export interface SentReportHistoryItem {
  id: string;
  sentAt: string;            // ISO 8601
  year: number;
  month: number;
  reportType: ReportType;
  sentTo: ReportRecipient[];
  skippedRecipients: ReportRecipient[];
  validations: ReportValidationItem[];
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
