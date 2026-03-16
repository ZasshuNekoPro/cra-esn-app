import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentGuard } from '../../../src/common/guards/consent.guard';
import { Role, ConsentStatus } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const makeContext = (userId: string, role: Role, params: Record<string, string> = {}): ExecutionContext => ({
  getHandler: vi.fn(),
  getClass: vi.fn(),
  switchToHttp: vi.fn().mockReturnValue({
    getRequest: vi.fn().mockReturnValue({
      user: { id: userId, role },
      params,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test' },
    }),
  }),
} as unknown as ExecutionContext);

const makePrisma = (consent: { status: string; grantedAt: Date | null; revokedAt: Date | null } | null) => ({
  consent: {
    findUnique: vi.fn().mockResolvedValue(consent),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
} as unknown as PrismaService);

describe('ConsentGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  });

  it('should be defined', () => {
    const guard = new ConsentGuard(reflector, makePrisma(null));
    expect(guard).toBeDefined();
  });

  it('allows EMPLOYEE to access their own data (no consent check needed)', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('employeeId');
    const prisma = makePrisma(null);
    const guard = new ConsentGuard(reflector, prisma);
    // Employee accesses their own resource
    const ctx = makeContext('emp-123', Role.EMPLOYEE, { employeeId: 'emp-123' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    // No DB call needed for self-access
    expect(prisma.consent.findUnique).not.toHaveBeenCalled();
  });

  it('allows ESN_ADMIN with active consent to access employee data', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('employeeId');
    const prisma = makePrisma({
      status: ConsentStatus.GRANTED,
      grantedAt: new Date(),
      revokedAt: null,
    });
    const guard = new ConsentGuard(reflector, prisma);
    const ctx = makeContext('admin-id', Role.ESN_ADMIN, { employeeId: 'emp-456' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CONSENT_ACCESS' }),
      }),
    );
  });

  it('throws ForbiddenException when ESN_ADMIN has no consent', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('employeeId');
    const prisma = makePrisma(null);
    const guard = new ConsentGuard(reflector, prisma);
    const ctx = makeContext('admin-id', Role.ESN_ADMIN, { employeeId: 'emp-456' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when consent is revoked', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue('employeeId');
    const prisma = makePrisma({
      status: ConsentStatus.REVOKED,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });
    const guard = new ConsentGuard(reflector, prisma);
    const ctx = makeContext('admin-id', Role.ESN_ADMIN, { employeeId: 'emp-456' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access when no consent param key is configured', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(null);
    const prisma = makePrisma(null);
    const guard = new ConsentGuard(reflector, prisma);
    const ctx = makeContext('admin-id', Role.ESN_ADMIN, {});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
