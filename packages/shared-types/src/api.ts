// ─── API Types — request/response contracts ───────────────────────────────────

import { Role, CraStatus, CraEntryType, PortionType, WeatherState, LeaveType, ProjectStatus, CommentVisibility, MilestoneStatus, ValidationStatus } from './enums';
import { PublicUser, Mission, CraMonth, CraEntry, Project, WeatherEntry, ProjectComment, Milestone, ProjectValidationRequest } from './entities';

// ── Generic wrappers ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  role: Role;
  esnId?: string | null;
  iat?: number;
  exp?: number;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  esnId?: string;
}

// ── ESN (companies) ───────────────────────────────────────────────────────────

export interface CreateEsnRequest {
  name: string;
  siret?: string;
  address?: string;
  logoUrl?: string;
}

export interface UpdateEsnRequest {
  name?: string;
  siret?: string;
  address?: string;
  logoUrl?: string;
}

// ── Missions ──────────────────────────────────────────────────────────────────

export interface CreateMissionRequest {
  title: string;
  description?: string;
  startDate: string; // ISO date string
  endDate?: string;
  dailyRate?: number;
  employeeId: string;
  esnAdminId?: string;
  clientId?: string;
}

export interface MissionWithRelations extends Mission {
  employee?: PublicUser;
  esnAdmin?: PublicUser | null;
  client?: PublicUser | null;
}

// ── CRA ───────────────────────────────────────────────────────────────────────

export interface CraMonthWithEntries extends CraMonth {
  entries: CraEntry[];
}

export interface CreateCraEntryRequest {
  date: string; // ISO date YYYY-MM-DD
  entryType: CraEntryType;
  dayFraction: number; // 0.5 or 1.0
  comment?: string;
  projectEntries?: Array<{ projectId: string; portion: PortionType }>;
}

export interface UpdateCraEntryRequest {
  entryType?: CraEntryType;
  dayFraction?: number;
  comment?: string;
  projectEntries?: Array<{ projectId: string; portion: PortionType }>;
}

export interface LeaveBalanceSummary {
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface CraMonthSummary {
  craMonthId: string;
  year: number;
  month: number;
  status: CraStatus;
  totalWorkDays: number;
  totalLeaveDays: number;
  totalSickDays: number;
  totalHolidayDays: number;
  workingDaysInMonth: number;
  isOvertime: boolean;
  leaveBalances: LeaveBalanceSummary[];
}

export interface SubmitCraRequest {
  craMonthId: string;
}

/** CRA month pending ESN validation — returned by GET /cra/pending-esn */
export interface PendingCraItem {
  craMonthId: string;
  year: number;
  month: number;
  employeeId: string;
  employeeName: string;
  submittedAt: string;   // ISO 8601 — date of SIGNED_EMPLOYEE transition
}

export interface PendingCraListResponse {
  count: number;
  items: PendingCraItem[];
}

export interface CraSummary {
  year: number;
  month: number;
  status: CraStatus;
  workedDays: number;
  paidLeaveDays: number;
  rttDays: number;
  sickDays: number;
  otherLeaveDays: number;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate: string; // ISO date
  endDate?: string;
  estimatedDays?: number;
  missionId: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  endDate?: string;
  estimatedDays?: number;
}

export interface ProjectSummary extends Project {
  latestWeather?: WeatherEntry | null;
  milestoneCount: number;
  lateMilestoneCount: number;
}

export interface ProjectDetail extends Project {
  weatherHistory: WeatherEntry[];
  milestones: (Milestone & { isLate: boolean })[];
  pendingValidations: ProjectValidationRequest[];
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface CreateWeatherEntryRequest {
  date: string; // ISO date
  state: WeatherState;
  comment?: string;
}

export interface WeatherMonthlySummary {
  dominantState: WeatherState;
  stormCount: number;
  entryCounts: Partial<Record<WeatherState, number>>;
}

// ── Comments ──────────────────────────────────────────────────────────────────

export interface CreateCommentRequest {
  content: string;
  visibility: CommentVisibility;
  isBlocker?: boolean;
}

export interface UpdateCommentRequest {
  content?: string;
  visibility?: CommentVisibility;
}

// ── Project Validations ───────────────────────────────────────────────────────

export interface CreateProjectValidationRequest {
  title: string;
  description: string;
  targetRole: Role;
}

export interface DecideValidationRequest {
  decisionComment?: string;
}

// ── Milestones ────────────────────────────────────────────────────────────────

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  dueDate?: string; // ISO date
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  status?: MilestoneStatus;
}

export interface CompleteMilestoneRequest {
  validatedAt?: string; // ISO date, optional
}

// ── Project Filters ───────────────────────────────────────────────────────────

export interface ProjectListQuery extends PaginationQuery {
  status?: ProjectStatus;
  missionId?: string;
}

export type { ProjectComment, ValidationStatus };

// ── Documents ─────────────────────────────────────────────────────────────────

export interface UploadDocumentRequest {
  name: string;
  type: string;
  missionId?: string;
}

export interface CreateShareLinkRequest {
  documentId: string;
  expiresInHours?: number;
  sharedWithId?: string;
}

export interface ShareLinkResponse {
  shareToken: string;
  shareUrl: string;
  expiresAt: Date;
}

// ── Consent ───────────────────────────────────────────────────────────────────

export interface RequestConsentRequest {
  employeeId: string;
  scope: string[];
}

export interface ConsentDecisionRequest {
  consentId: string;
  decision: 'grant' | 'revoke';
}

// ── Pagination / Filters ──────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface CraListQuery extends PaginationQuery {
  year?: number;
  month?: number;
  status?: CraStatus;
}

export interface DocumentListQuery extends PaginationQuery {
  type?: string;
  missionId?: string;
}

// ── RAG ───────────────────────────────────────────────────────────────────────

export type RagSourceType =
  | 'cra_entry'
  | 'cra_month'
  | 'project_comment'
  | 'weather_entry'
  | 'milestone'
  | 'document';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagFilters {
  sourceType?: RagSourceType[];
  projectId?: string;
  year?: number;
  month?: number;
}

export interface RagSource {
  sourceType: RagSourceType;
  sourceId: string;
  date?: string;
  excerpt: string;
}

export interface RagQueryRequest {
  question: string;
  messages?: ConversationTurn[];
  filters?: RagFilters;
}

export interface RagQueryResponse {
  answer: string;
  sources: RagSource[];
}

/** Internal event payload emitted by backend modules after mutations */
export interface RagIndexEvent {
  employeeId: string;
  sourceType: RagSourceType;
  sourceId: string;
}
