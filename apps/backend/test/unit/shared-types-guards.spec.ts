import { describe, it, expect } from 'vitest';
import { isEmployee, isEsnAdmin, isClient, isJwtPayload } from '@esn/shared-types';
import { Role } from '@esn/shared-types';

describe('shared-types — type guards', () => {
  describe('isEmployee', () => {
    it('returns true for EMPLOYEE role', () => {
      expect(isEmployee({ role: Role.EMPLOYEE })).toBe(true);
    });
    it('returns false for ESN_ADMIN', () => {
      expect(isEmployee({ role: Role.ESN_ADMIN })).toBe(false);
    });
    it('returns false for CLIENT', () => {
      expect(isEmployee({ role: Role.CLIENT })).toBe(false);
    });
  });

  describe('isEsnAdmin', () => {
    it('returns true for ESN_ADMIN role', () => {
      expect(isEsnAdmin({ role: Role.ESN_ADMIN })).toBe(true);
    });
    it('returns false for EMPLOYEE', () => {
      expect(isEsnAdmin({ role: Role.EMPLOYEE })).toBe(false);
    });
  });

  describe('isClient', () => {
    it('returns true for CLIENT role', () => {
      expect(isClient({ role: Role.CLIENT })).toBe(true);
    });
    it('returns false for EMPLOYEE', () => {
      expect(isClient({ role: Role.EMPLOYEE })).toBe(false);
    });
  });

  describe('isJwtPayload', () => {
    it('returns true for a valid payload', () => {
      expect(isJwtPayload({ sub: 'uuid-123', email: 'a@b.com', role: Role.EMPLOYEE })).toBe(true);
    });

    it('returns false if sub is missing', () => {
      expect(isJwtPayload({ email: 'a@b.com', role: Role.EMPLOYEE })).toBe(false);
    });

    it('returns false if role is not a valid Role enum value', () => {
      expect(isJwtPayload({ sub: 'id', email: 'a@b.com', role: 'SUPERADMIN' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isJwtPayload(null)).toBe(false);
    });

    it('returns false for a string', () => {
      expect(isJwtPayload('not an object')).toBe(false);
    });
  });
});
