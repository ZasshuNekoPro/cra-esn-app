import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResourceOwnerGuard } from '../../../src/common/guards/resource-owner.guard';
import { Role } from '@esn/shared-types';

const makeContext = (
  userId: string,
  role: Role,
  params: Record<string, string> = {},
): ExecutionContext => ({
  getHandler: vi.fn(),
  getClass: vi.fn(),
  switchToHttp: vi.fn().mockReturnValue({
    getRequest: vi.fn().mockReturnValue({ user: { id: userId, role }, params }),
  }),
} as unknown as ExecutionContext);

describe('ResourceOwnerGuard', () => {
  let guard: ResourceOwnerGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    guard = new ResourceOwnerGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows ESN_ADMIN to access any resource', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('userId');
    const ctx = makeContext('admin-id', Role.ESN_ADMIN, { userId: 'other-user-id' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows EMPLOYEE to access their own resource', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('userId');
    const ctx = makeContext('emp-123', Role.EMPLOYEE, { userId: 'emp-123' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when EMPLOYEE accesses another user resource', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('userId');
    const ctx = makeContext('emp-123', Role.EMPLOYEE, { userId: 'other-456' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows access when no owner param key is configured (guard is a no-op)', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(null);
    const ctx = makeContext('emp-123', Role.EMPLOYEE, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
