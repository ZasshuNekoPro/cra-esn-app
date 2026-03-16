import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { Role } from '@esn/shared-types';

const makeContext = (role: Role | null, handler = vi.fn(), cls = vi.fn()): ExecutionContext => ({
  getHandler: vi.fn().mockReturnValue(handler),
  getClass: vi.fn().mockReturnValue(cls),
  switchToHttp: vi.fn().mockReturnValue({
    getRequest: vi.fn().mockReturnValue({ user: role ? { role } : undefined }),
  }),
} as unknown as ExecutionContext);

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows access when no roles are required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(null);
    const ctx = makeContext(Role.EMPLOYEE);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has required role', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ESN_ADMIN]);
    const ctx = makeContext(Role.ESN_ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ESN_ADMIN]);
    const ctx = makeContext(Role.EMPLOYEE);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is not authenticated', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.EMPLOYEE]);
    const ctx = makeContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows access when user role matches one of multiple required roles', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ESN_ADMIN, Role.CLIENT]);
    const ctx = makeContext(Role.CLIENT);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
