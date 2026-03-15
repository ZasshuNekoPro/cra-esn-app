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
  SIGNED_CLIENT = 'SIGNED_CLIENT',
  LOCKED = 'LOCKED',
}

export enum WeatherStatus {
  GREEN = 'GREEN',
  ORANGE = 'ORANGE',
  RED = 'RED',
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
}
