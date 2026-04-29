// ─── Type Guards — runtime narrowing utilities ────────────────────────────────
import { Role } from './enums';
import { User } from './entities';
import { JwtPayload } from './api';

export function isEmployee(user: Pick<User, 'role'>): boolean {
  return user.role === Role.EMPLOYEE;
}

export function isEsnAdmin(user: Pick<User, 'role'>): boolean {
  return user.role === Role.ESN_ADMIN;
}

export function isEsnStaff(user: Pick<User, 'role'>): boolean {
  return user.role === Role.ESN_ADMIN;
}

export function isClient(user: Pick<User, 'role'>): boolean {
  return user.role === Role.CLIENT;
}

export function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    'email' in value &&
    'role' in value &&
    typeof (value as JwtPayload).sub === 'string' &&
    typeof (value as JwtPayload).email === 'string' &&
    Object.values(Role).includes((value as JwtPayload).role)
  );
}
