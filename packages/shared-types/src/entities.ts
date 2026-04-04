// ─── Entity Interfaces — mirrors Prisma models ────────────────────────────────
import {
  Role,
  CraStatus,
  CraEntryType,
  PortionType,
  WeatherState,
  LeaveType,
  DocumentType,
  ConsentStatus,
  ValidationStatus,
  NotificationChannel,
  ProjectStatus,
  CommentVisibility,
  MilestoneStatus,
} from './enums';

// ── Base ──────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface Esn extends BaseEntity {
  name: string;
  siret?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  esnId?: string | null;
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
  estimatedDays?: number | null;
  status: ProjectStatus;
  closedAt?: Date | null;
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
  state: WeatherState;
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
  visibility: CommentVisibility;
  isBlocker: boolean;
  resolvedAt?: Date | null;
  resolvedById?: string | null;
  projectId: string;
  authorId: string;
}

// ── Project Validation ────────────────────────────────────────────────────────

export interface ProjectValidationRequest {
  id: string;
  title: string;
  description: string;
  targetRole: Role;
  status: ValidationStatus;
  decisionComment?: string | null;
  requestedAt: Date;
  resolvedAt?: Date | null;
  projectId: string;
  requestedById: string;
  resolverId?: string | null;
  createdAt: Date;
}

export interface ProjectValidationDocument {
  id: string;
  validationId: string;
  documentId: string;
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
  status: MilestoneStatus;
  completedAt?: Date | null;
  validatedAt?: Date | null;
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
  uploadedById?: string | null;
  createdAt: Date;
}

export interface DocumentShare {
  id: string;
  shareToken?: string | null;
  expiresAt?: Date | null;
  accessedAt?: Date | null;
  revokedAt?: Date | null;
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
