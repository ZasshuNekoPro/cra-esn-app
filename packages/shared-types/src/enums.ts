// ─── Shared Enums — ESN CRA App ───────────────────────────────────────────────
// Keep in sync with apps/backend/prisma/schema.prisma

export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  ESN_ADMIN = 'ESN_ADMIN',
  CLIENT = 'CLIENT',
}

export enum CraStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  SIGNED_EMPLOYEE = 'SIGNED_EMPLOYEE',
  SIGNED_ESN = 'SIGNED_ESN',
  SIGNED_CLIENT = 'SIGNED_CLIENT',
  LOCKED = 'LOCKED',
}

export enum CraEntryType {
  WORK_ONSITE = 'WORK_ONSITE',
  WORK_REMOTE = 'WORK_REMOTE',
  WORK_TRAVEL = 'WORK_TRAVEL',
  LEAVE_CP = 'LEAVE_CP',
  LEAVE_RTT = 'LEAVE_RTT',
  SICK = 'SICK',
  HOLIDAY = 'HOLIDAY',
  TRAINING = 'TRAINING',
  ASTREINTE = 'ASTREINTE',
  OVERTIME = 'OVERTIME',
}

export enum PortionType {
  FULL = 'FULL',
  HALF_AM = 'HALF_AM',
  HALF_PM = 'HALF_PM',
}

/** @deprecated Use WeatherState instead */
export enum WeatherStatus {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
}

export enum WeatherState {
  SUNNY = 'SUNNY',
  CLOUDY = 'CLOUDY',
  RAINY = 'RAINY',
  STORM = 'STORM',
  VALIDATION_PENDING = 'VALIDATION_PENDING',
  VALIDATED = 'VALIDATED',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum CommentVisibility {
  EMPLOYEE_ESN = 'EMPLOYEE_ESN',
  EMPLOYEE_CLIENT = 'EMPLOYEE_CLIENT',
  ALL = 'ALL',
}

export enum MilestoneStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  LATE = 'LATE',
  ARCHIVED = 'ARCHIVED',
}

export enum LeaveType {
  PAID_LEAVE = 'PAID_LEAVE',
  RTT = 'RTT',
  SICK_LEAVE = 'SICK_LEAVE',
  OTHER = 'OTHER',
}

export enum DocumentType {
  CRA_PDF = 'CRA_PDF',
  CONTRACT = 'CONTRACT',
  AMENDMENT = 'AMENDMENT',
  MISSION_ORDER = 'MISSION_ORDER',
  OTHER = 'OTHER',
}

export enum ConsentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  REVOKED = 'REVOKED',
}

export enum ValidationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

export enum AuditAction {
  CONSENT_ACCESS = 'CONSENT_ACCESS',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  DOCUMENT_ACCESSED = 'DOCUMENT_ACCESSED',
  CRA_SUBMITTED = 'CRA_SUBMITTED',
  CRA_SIGNED = 'CRA_SIGNED',
  CRA_LOCKED = 'CRA_LOCKED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  // Projects
  PROJECT_CLOSED = 'PROJECT_CLOSED',
  WEATHER_UPDATED = 'WEATHER_UPDATED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  VALIDATION_REQUESTED = 'VALIDATION_REQUESTED',
  VALIDATION_APPROVED = 'VALIDATION_APPROVED',
  VALIDATION_REJECTED = 'VALIDATION_REJECTED',
}
