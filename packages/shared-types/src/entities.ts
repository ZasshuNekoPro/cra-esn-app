// ─── Entity Interfaces — mirrors Prisma models ────────────────────────────────
import {
  Role,
  CraStatus,
  CraEntryType,
  PortionType,
  WeatherStatus,
  LeaveType,
  DocumentType,
  ConsentStatus,
  ValidationStatus,
  NotificationChannel,
} from './enums';

// ── Base ──────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  deletedAt?: Date | null;
}

/** User without sensitive fields — safe to expose via API */
export type PublicUser = Omit<User, 'deletedAt'>;

// ── Mission ───────────────────────────────────────────────────────────────────

export interface Mission extends BaseEntity {
  title: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date | null;
  dailyRate?: number | null;
  isActive: boolean;
  employeeId: string;
  esnAdminId?: string | null;
  clientId?: string | null;
}

// ── CRA ───────────────────────────────────────────────────────────────────────

export interface CraMonth extends BaseEntity {
  year: number;
  month: number;
  status: CraStatus;
  pdfUrl?: string | null;
  submittedAt?: Date | null;
  lockedAt?: Date | null;
  signedByEmployeeAt?: Date | null;
  signedByEsnAt?: Date | null;
  signedByClientAt?: Date | null;
  rejectionComment?: string | null;
  employeeId: string;
  missionId: string;
}

export interface CraEntry {
  id: string;
  date: Date;
  dayFraction: number; // 0.5 or 1.0
  entryType: CraEntryType;
  comment?: string | null;
  craMonthId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Leave Balance ─────────────────────────────────────────────────────────────

export interface LeaveBalance {
  id: string;
  year: number;
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  userId: string;
  updatedAt: Date;
}

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project extends BaseEntity {
  name: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
  missionId: string;
}

export interface ProjectEntry {
  id: string;
  date: Date;
  hoursSpent?: number | null;
  description?: string | null;
  projectId: string;
  employeeId: string;
  portion?: PortionType | null;
  craEntryId?: string | null;
  createdAt: Date;
}

// ── Public Holiday ─────────────────────────────────────────────────────────────

export interface PublicHoliday {
  id: string;
  date: Date;
  name: string;
  country: string;
}

// ── Weather ───────────────────────────────────────────────────────────────────

export interface WeatherEntry {
  id: string;
  date: Date;
  status: WeatherStatus;
  comment?: string | null;
  isEscalated: boolean;
  escalatedAt?: Date | null;
  projectId: string;
  reportedById: string;
  createdAt: Date;
}

// ── Project Comment ───────────────────────────────────────────────────────────

export interface ProjectComment extends BaseEntity {
  content: string;
  isPrivate: boolean;
  projectId: string;
  authorId: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationRequest {
  id: string;
  status: ValidationStatus;
  comment?: string | null;
  requestedAt: Date;
  resolvedAt?: Date | null;
  craMonthId: string;
  validatorId: string;
}

// ── Milestone ─────────────────────────────────────────────────────────────────

export interface Milestone extends BaseEntity {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  projectId: string;
  createdById: string;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export interface Document extends BaseEntity {
  name: string;
  type: DocumentType;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  missionId?: string | null;
}

export interface DocumentVersion {
  id: string;
  version: number;
  s3Key: string;
  sizeBytes: number;
  documentId: string;
  createdAt: Date;
}

export interface DocumentShare {
  id: string;
  shareToken?: string | null;
  expiresAt?: Date | null;
  accessedAt?: Date | null;
  documentId: string;
  sharedWithId?: string | null;
  createdAt: Date;
}

// ── Consent ───────────────────────────────────────────────────────────────────

export interface Consent {
  id: string;
  status: ConsentStatus;
  scope: string[];
  grantedAt?: Date | null;
  revokedAt?: Date | null;
  expiresAt?: Date | null;
  employeeId: string;
  requestedById: string;
  createdAt: Date;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  initiatorId: string;
  createdAt: Date;
}

// ── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  isRead: boolean;
  sentAt?: Date | null;
  readAt?: Date | null;
  userId: string;
  createdAt: Date;
}
