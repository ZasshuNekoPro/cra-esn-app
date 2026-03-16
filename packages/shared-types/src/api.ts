// ─── API Types — request/response contracts ───────────────────────────────────

import { Role, CraStatus, WeatherStatus } from './enums';
import { PublicUser, Mission, CraMonth, CraEntry, Project, WeatherEntry } from './entities';

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
  date: string; // ISO date string (YYYY-MM-DD)
  dayFraction: 0.5 | 1;
  leaveType?: string;
  comment?: string;
}

export interface UpdateCraEntryRequest {
  dayFraction?: 0.5 | 1;
  leaveType?: string | null;
  comment?: string | null;
}

export interface SubmitCraRequest {
  craMonthId: string;
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
  startDate: string;
  endDate?: string;
  missionId: string;
}

export interface ProjectWithWeather extends Project {
  latestWeather?: WeatherEntry | null;
  weatherHistory?: WeatherEntry[];
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface CreateWeatherEntryRequest {
  date: string;
  status: WeatherStatus;
  comment?: string;
  projectId: string;
}

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
