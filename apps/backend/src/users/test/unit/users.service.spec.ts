import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users.service';
import { Role } from '@esn/shared-types';
import * as bcrypt from 'bcryptjs';

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

// ── updateMe ─────────────────────────────────────────────────────────────────

describe('UsersService — updateMe', () => {
  let service: UsersService;

  const existingUser = {
    id: 'u1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Dupont',
    role: Role.EMPLOYEE,
    phone: null,
    avatarUrl: null,
    password: 'hashed',
    deletedAt: null,
    esnId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({ ...existingUser, firstName: 'Alicia' });
    service = new UsersService(mockPrisma as never);
  });

  it('updates and returns the public profile', async () => {
    const result = await service.updateMe('u1', { firstName: 'Alicia' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ firstName: 'Alicia' }),
      }),
    );
    expect(result).toMatchObject({ firstName: 'Alicia' });
  });

  it('ignores undefined fields (only patches provided fields)', async () => {
    await service.updateMe('u1', { lastName: 'Martin' });
    const call = mockPrisma.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data).not.toHaveProperty('firstName');
    expect(call.data).toHaveProperty('lastName', 'Martin');
  });

  it('converts empty phone to null', async () => {
    await service.updateMe('u1', { phone: '' });
    const call = mockPrisma.user.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data).toHaveProperty('phone', null);
  });

  it('throws NotFoundException when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(service.updateMe('unknown', { firstName: 'X' })).rejects.toThrow(NotFoundException);
  });
});

// ── changePassword ───────────────────────────────────────────────────────────

describe('UsersService — changePassword', () => {
  let service: UsersService;

  const existingUser = {
    id: 'u1',
    email: 'alice@example.com',
    password: '',
    deletedAt: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const hashed = await bcrypt.hash('ancien123', 10);
    mockPrisma.user.findUnique.mockResolvedValue({ ...existingUser, password: hashed });
    mockPrisma.user.update.mockResolvedValue(undefined);
    service = new UsersService(mockPrisma as never);
  });

  it('updates the password when current password is correct', async () => {
    await service.changePassword('u1', { currentPassword: 'ancien123', newPassword: 'nouveau123' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
    const call = mockPrisma.user.update.mock.calls[0][0] as { data: { password: string } };
    const isNewHash = await bcrypt.compare('nouveau123', call.data.password);
    expect(isNewHash).toBe(true);
  });

  it('throws UnauthorizedException when current password is wrong', async () => {
    await expect(
      service.changePassword('u1', { currentPassword: 'wrong', newPassword: 'nouveau123' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.changePassword('unknown', { currentPassword: 'x', newPassword: 'y' }),
    ).rejects.toThrow(NotFoundException);
  });
});
