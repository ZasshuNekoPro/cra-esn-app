import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../../src/users/users.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@esn/shared-types';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(mockPrisma as never);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('PLATFORM_ADMIN can create ESN_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '1', email: 'esn@test.com', role: Role.ESN_ADMIN });

      const dto = { email: 'esn@test.com', password: 'password123', firstName: 'ESN', lastName: 'Corp', role: Role.ESN_ADMIN };
      const result = await service.create(dto, Role.PLATFORM_ADMIN);
      expect(result).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('PLATFORM_ADMIN cannot create EMPLOYEE', async () => {
      const dto = { email: 'emp@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await expect(service.create(dto, Role.PLATFORM_ADMIN)).rejects.toThrow(ForbiddenException);
    });

    it('ESN_ADMIN can create EMPLOYEE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '2', role: Role.EMPLOYEE });

      const dto = { email: 'emp@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await service.create(dto, Role.ESN_ADMIN);
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('ESN_ADMIN can create CLIENT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '3', role: Role.CLIENT });

      const dto = { email: 'client@test.com', password: 'password123', firstName: 'C', lastName: 'D', role: Role.CLIENT };
      await service.create(dto, Role.ESN_ADMIN);
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('ESN_ADMIN cannot create ESN_ADMIN', async () => {
      const dto = { email: 'esn2@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.ESN_ADMIN };
      await expect(service.create(dto, Role.ESN_ADMIN)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if email already used', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const dto = { email: 'taken@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await expect(service.create(dto, Role.ESN_ADMIN)).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('PLATFORM_ADMIN sees all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.findAll(Role.PLATFORM_ADMIN);
      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('ESN_ADMIN sees only EMPLOYEE and CLIENT', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await service.findAll(Role.ESN_ADMIN);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, role: { in: [Role.EMPLOYEE, Role.CLIENT] } },
        }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns user if found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });

    it('throws NotFoundException if not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── softDelete ─────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets deletedAt on the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.update.mockResolvedValue({});
      await service.softDelete('1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' } }),
      );
    });

    it('throws NotFoundException if user missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.softDelete('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
