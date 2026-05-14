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
      const result = await service.create(dto, Role.PLATFORM_ADMIN, null);
      expect(result).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('PLATFORM_ADMIN cannot create EMPLOYEE', async () => {
      const dto = { email: 'emp@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await expect(service.create(dto, Role.PLATFORM_ADMIN, null)).rejects.toThrow(ForbiddenException);
    });

    it('ESN_ADMIN can create EMPLOYEE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '2', role: Role.EMPLOYEE });

      const dto = { email: 'emp@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await service.create(dto, Role.ESN_ADMIN, 'esn-1');
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('ESN_ADMIN can create CLIENT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: '3', role: Role.CLIENT });

      const dto = { email: 'client@test.com', password: 'password123', firstName: 'C', lastName: 'D', role: Role.CLIENT };
      await service.create(dto, Role.ESN_ADMIN, 'esn-1');
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('ESN_ADMIN cannot create ESN_ADMIN', async () => {
      const dto = { email: 'esn2@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.ESN_ADMIN };
      await expect(service.create(dto, Role.ESN_ADMIN, 'esn-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if email already used', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      const dto = { email: 'taken@test.com', password: 'password123', firstName: 'A', lastName: 'B', role: Role.EMPLOYEE };
      await expect(service.create(dto, Role.ESN_ADMIN, 'esn-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('PLATFORM_ADMIN sees all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.findAll(Role.PLATFORM_ADMIN, null);
      expect(result).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('ESN_ADMIN sees only EMPLOYEE and CLIENT in their ESN', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await service.findAll(Role.ESN_ADMIN, 'esn-1');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, esnId: 'esn-1', role: { in: [Role.EMPLOYEE, Role.CLIENT] } },
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

  // ── setEsnReferent ─────────────────────────────────────────────────────────

  describe('setEsnReferent', () => {
    const EMPLOYEE = { id: 'emp-1', role: Role.EMPLOYEE, esnId: 'esn-1' };
    const REFERENT = { id: 'admin-1', role: Role.ESN_ADMIN, esnId: 'esn-1' };

    it('ESN_ADMIN can set esnReferentId on an employee in their ESN', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(EMPLOYEE)
        .mockResolvedValueOnce(REFERENT);
      mockPrisma.user.update.mockResolvedValue({ ...EMPLOYEE, esnReferentId: 'admin-1' });

      await service.setEsnReferent('emp-1', 'admin-1', Role.ESN_ADMIN, 'esn-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { esnReferentId: 'admin-1' } }),
      );
    });

    it('ESN_ADMIN can clear esnReferentId by passing null', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(EMPLOYEE);
      mockPrisma.user.update.mockResolvedValue({ ...EMPLOYEE, esnReferentId: null });

      await service.setEsnReferent('emp-1', null, Role.ESN_ADMIN, 'esn-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { esnReferentId: null } }),
      );
    });

    it('throws ForbiddenException if employee does not belong to caller ESN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...EMPLOYEE, esnId: 'other-esn' });

      await expect(
        service.setEsnReferent('emp-1', 'admin-1', Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if target user is not an EMPLOYEE', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...EMPLOYEE, role: Role.CLIENT });

      await expect(
        service.setEsnReferent('emp-1', 'admin-1', Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if referent admin does not exist', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(EMPLOYEE)
        .mockResolvedValueOnce(null);

      await expect(
        service.setEsnReferent('emp-1', 'ghost-admin', Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if referent is not an ESN_ADMIN', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(EMPLOYEE)
        .mockResolvedValueOnce({ ...REFERENT, role: Role.EMPLOYEE });

      await expect(
        service.setEsnReferent('emp-1', 'admin-1', Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if referent belongs to another ESN', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(EMPLOYEE)
        .mockResolvedValueOnce({ ...REFERENT, esnId: 'other-esn' });

      await expect(
        service.setEsnReferent('emp-1', 'admin-other', Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── setCanSeeAllReports ────────────────────────────────────────────────────

  describe('setCanSeeAllReports', () => {
    const TARGET_ADMIN = { id: 'admin-2', role: Role.ESN_ADMIN, esnId: 'esn-1' };

    it('ESN_ADMIN can grant canSeeAllEsnReports to another admin in their ESN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(TARGET_ADMIN);
      mockPrisma.user.update.mockResolvedValue({ ...TARGET_ADMIN, canSeeAllEsnReports: true });

      await service.setCanSeeAllReports('admin-2', true, Role.ESN_ADMIN, 'esn-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { canSeeAllEsnReports: true } }),
      );
    });

    it('ESN_ADMIN can revoke canSeeAllEsnReports', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...TARGET_ADMIN, canSeeAllEsnReports: true });
      mockPrisma.user.update.mockResolvedValue({ ...TARGET_ADMIN, canSeeAllEsnReports: false });

      await service.setCanSeeAllReports('admin-2', false, Role.ESN_ADMIN, 'esn-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { canSeeAllEsnReports: false } }),
      );
    });

    it('throws ForbiddenException if target belongs to another ESN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...TARGET_ADMIN, esnId: 'other-esn' });

      await expect(
        service.setCanSeeAllReports('admin-2', true, Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if target is not an ESN_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...TARGET_ADMIN, role: Role.EMPLOYEE });

      await expect(
        service.setCanSeeAllReports('admin-2', true, Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setCanSeeAllReports('ghost', true, Role.ESN_ADMIN, 'esn-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
