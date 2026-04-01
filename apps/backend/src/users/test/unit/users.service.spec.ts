import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../users.service';
import { Role } from '@esn/shared-types';

// ─── Mock PrismaService ────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeDto = (role: Role, overrides: Record<string, unknown> = {}) => ({
  email: `test-${Math.random()}@example.com`,
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'User',
  role,
  ...overrides,
});

const publicUser = (role: Role, esnId?: string | null) => ({
  id: 'user-uuid',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role,
  phone: null,
  avatarUrl: null,
  esnId: esnId ?? null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService — assertCanCreate (role-creation rules)', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve(publicUser(data.role as Role, data.esnId)),
    );
    service = new UsersService(mockPrisma as never);
  });

  // ── PLATFORM_ADMIN ────────────────────────────────────────────────────────

  it('PLATFORM_ADMIN can create ESN_ADMIN', async () => {
    const dto = makeDto(Role.ESN_ADMIN);
    await expect(service.create(dto, Role.PLATFORM_ADMIN, null)).resolves.toBeDefined();
  });

  it('PLATFORM_ADMIN can create ESN_MANAGER', async () => {
    const dto = makeDto(Role.ESN_MANAGER, { esnId: 'esn-uuid' });
    await expect(service.create(dto, Role.PLATFORM_ADMIN, null)).resolves.toBeDefined();
  });

  it('PLATFORM_ADMIN cannot create EMPLOYEE', async () => {
    await expect(service.create(makeDto(Role.EMPLOYEE), Role.PLATFORM_ADMIN, null)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('PLATFORM_ADMIN cannot create CLIENT', async () => {
    await expect(service.create(makeDto(Role.CLIENT), Role.PLATFORM_ADMIN, null)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ── ESN_ADMIN ─────────────────────────────────────────────────────────────

  it('ESN_ADMIN can create EMPLOYEE', async () => {
    const dto = makeDto(Role.EMPLOYEE);
    await expect(service.create(dto, Role.ESN_ADMIN, 'esn-uuid')).resolves.toBeDefined();
  });

  it('ESN_ADMIN can create CLIENT', async () => {
    const dto = makeDto(Role.CLIENT);
    await expect(service.create(dto, Role.ESN_ADMIN, 'esn-uuid')).resolves.toBeDefined();
  });

  it('ESN_ADMIN cannot create another ESN_ADMIN', async () => {
    await expect(service.create(makeDto(Role.ESN_ADMIN), Role.ESN_ADMIN, 'esn-uuid')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ESN_ADMIN cannot create ESN_MANAGER', async () => {
    await expect(
      service.create(makeDto(Role.ESN_MANAGER), Role.ESN_ADMIN, 'esn-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── ESN_MANAGER ───────────────────────────────────────────────────────────

  it('ESN_MANAGER can create EMPLOYEE', async () => {
    const dto = makeDto(Role.EMPLOYEE);
    await expect(service.create(dto, Role.ESN_MANAGER, 'esn-uuid')).resolves.toBeDefined();
  });

  it('ESN_MANAGER can create CLIENT', async () => {
    const dto = makeDto(Role.CLIENT);
    await expect(service.create(dto, Role.ESN_MANAGER, 'esn-uuid')).resolves.toBeDefined();
  });

  it('ESN_MANAGER cannot create ESN_ADMIN', async () => {
    await expect(
      service.create(makeDto(Role.ESN_ADMIN), Role.ESN_MANAGER, 'esn-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ESN_MANAGER cannot create ESN_MANAGER', async () => {
    await expect(
      service.create(makeDto(Role.ESN_MANAGER), Role.ESN_MANAGER, 'esn-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ESN_MANAGER cannot create PLATFORM_ADMIN', async () => {
    await expect(
      service.create(makeDto(Role.PLATFORM_ADMIN), Role.ESN_MANAGER, 'esn-uuid'),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── EMPLOYEE/CLIENT cannot create users ───────────────────────────────────

  it('EMPLOYEE cannot create any user', async () => {
    await expect(service.create(makeDto(Role.EMPLOYEE), Role.EMPLOYEE, null)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('CLIENT cannot create any user', async () => {
    await expect(service.create(makeDto(Role.EMPLOYEE), Role.CLIENT, null)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('UsersService — esnId propagation', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve(publicUser(data.role as Role, data.esnId)),
    );
    service = new UsersService(mockPrisma as never);
  });

  it('ESN_ADMIN: created EMPLOYEE inherits caller esnId', async () => {
    const dto = makeDto(Role.EMPLOYEE);
    const result = await service.create(dto, Role.ESN_ADMIN, 'esn-uuid-123');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ esnId: 'esn-uuid-123' }),
      }),
    );
    expect(result.esnId).toBe('esn-uuid-123');
  });

  it('ESN_MANAGER: created EMPLOYEE inherits caller esnId', async () => {
    const dto = makeDto(Role.EMPLOYEE);
    const result = await service.create(dto, Role.ESN_MANAGER, 'esn-uuid-456');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ esnId: 'esn-uuid-456' }),
      }),
    );
    expect(result.esnId).toBe('esn-uuid-456');
  });

  it('PLATFORM_ADMIN creating ESN_MANAGER sets esnId from dto', async () => {
    const dto = makeDto(Role.ESN_MANAGER, { esnId: 'esn-uuid-789' });
    await service.create(dto, Role.PLATFORM_ADMIN, null);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ esnId: 'esn-uuid-789' }),
      }),
    );
  });

  it('duplicate email throws ConflictException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.create(makeDto(Role.EMPLOYEE), Role.ESN_ADMIN, 'esn-uuid')).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('UsersService — findAll scoping', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findMany.mockResolvedValue([]);
    service = new UsersService(mockPrisma as never);
  });

  it('PLATFORM_ADMIN sees all users (no filter)', async () => {
    await service.findAll(Role.PLATFORM_ADMIN, null);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ esnId: expect.anything() }),
      }),
    );
  });

  it('ESN_ADMIN sees only EMPLOYEE+CLIENT scoped to their ESN', async () => {
    await service.findAll(Role.ESN_ADMIN, 'esn-uuid');
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          esnId: 'esn-uuid',
          role: { in: [Role.EMPLOYEE, Role.CLIENT] },
        }),
      }),
    );
  });

  it('ESN_MANAGER sees only EMPLOYEE+CLIENT scoped to their ESN', async () => {
    await service.findAll(Role.ESN_MANAGER, 'esn-uuid');
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          esnId: 'esn-uuid',
          role: { in: [Role.EMPLOYEE, Role.CLIENT] },
        }),
      }),
    );
  });
});
