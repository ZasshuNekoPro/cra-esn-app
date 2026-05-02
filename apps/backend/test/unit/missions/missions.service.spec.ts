import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissionsService } from '../../../src/missions/missions.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@esn/shared-types';

const mockPrisma = {
  mission: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const MISSION = {
  id: 'mission-1',
  title: 'Test Mission',
  employeeId: 'emp-1',
  esnAdminId: 'esn-1',
  clientId: 'client-1',
  isActive: true,
};

describe('MissionsService', () => {
  let service: MissionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MissionsService(mockPrisma as never);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      title: 'New Mission',
      startDate: '2026-01-01',
      employeeId: 'emp-1',
    };

    it('ESN_ADMIN creates mission for any employee', async () => {
      mockPrisma.mission.create.mockResolvedValue(MISSION);
      await service.create(dto, 'esn-1', Role.ESN_ADMIN, 'esn-uuid');
      expect(mockPrisma.mission.create).toHaveBeenCalledOnce();
    });

    it('EMPLOYEE creates mission only for themselves', async () => {
      mockPrisma.mission.create.mockResolvedValue(MISSION);
      await service.create({ ...dto, employeeId: 'emp-1' }, 'emp-1', Role.EMPLOYEE, null);
      expect(mockPrisma.mission.create).toHaveBeenCalledOnce();
    });

    it('EMPLOYEE cannot create mission for another employee', async () => {
      await expect(
        service.create({ ...dto, employeeId: 'other-emp' }, 'emp-1', Role.EMPLOYEE, null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CLIENT creates mission with self as clientId', async () => {
      mockPrisma.mission.create.mockResolvedValue(MISSION);
      const clientDto = { ...dto, clientId: 'client-1' };
      await service.create(clientDto, 'client-1', Role.CLIENT, null);
      expect(mockPrisma.mission.create).toHaveBeenCalledOnce();
    });

    it('CLIENT cannot set another client', async () => {
      await expect(
        service.create({ ...dto, clientId: 'other-client' }, 'client-1', Role.CLIENT, null),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('ESN_ADMIN sees active missions scoped to their ESN', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([MISSION]);
      await service.findAll('esn-1', Role.ESN_ADMIN, 'esn-uuid');
      expect(mockPrisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, employee: { esnId: 'esn-uuid' } },
        }),
      );
    });

    it('EMPLOYEE sees only their missions', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([]);
      await service.findAll('emp-1', Role.EMPLOYEE, null);
      expect(mockPrisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId: 'emp-1', isActive: true } }),
      );
    });

    it('CLIENT sees only their missions', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([]);
      await service.findAll('client-1', Role.CLIENT, null);
      expect(mockPrisma.mission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clientId: 'client-1', isActive: true } }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('ESN_ADMIN can access any mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      await service.findOne('mission-1', 'esn-1', Role.ESN_ADMIN);
      expect(mockPrisma.mission.findUnique).toHaveBeenCalledOnce();
    });

    it('EMPLOYEE can access own mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      await service.findOne('mission-1', 'emp-1', Role.EMPLOYEE);
    });

    it('EMPLOYEE cannot access mission they are not part of', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      await expect(service.findOne('mission-1', 'other-emp', Role.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for missing mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', 'esn-1', Role.ESN_ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update / deactivate ────────────────────────────────────────────────────

  describe('update', () => {
    it('ESN_ADMIN can update mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      mockPrisma.mission.update.mockResolvedValue({ ...MISSION, title: 'Updated' });
      await service.update('mission-1', { title: 'Updated' }, Role.ESN_ADMIN);
      expect(mockPrisma.mission.update).toHaveBeenCalledOnce();
    });

    it('ESN_ADMIN can assign esnAdminId on a mission that had none', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue({ ...MISSION, esnAdminId: null });
      mockPrisma.mission.update.mockResolvedValue({ ...MISSION, esnAdminId: 'new-esn-admin' });
      await service.update('mission-1', { esnAdminId: 'new-esn-admin' }, Role.ESN_ADMIN);
      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ esnAdminId: 'new-esn-admin' }),
        }),
      );
    });

    it('ESN_ADMIN can clear esnAdminId by passing null', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      mockPrisma.mission.update.mockResolvedValue({ ...MISSION, esnAdminId: null });
      await service.update('mission-1', { esnAdminId: null }, Role.ESN_ADMIN);
      expect(mockPrisma.mission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ esnAdminId: null }),
        }),
      );
    });

    it('EMPLOYEE cannot update mission', async () => {
      await expect(service.update('mission-1', {}, Role.EMPLOYEE)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivate', () => {
    it('ESN_ADMIN can deactivate mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(MISSION);
      mockPrisma.mission.update.mockResolvedValue({});
      await service.deactivate('mission-1', Role.ESN_ADMIN);
      expect(mockPrisma.mission.update).toHaveBeenCalledWith({ where: { id: 'mission-1' }, data: { isActive: false } });
    });

    it('CLIENT cannot deactivate mission', async () => {
      await expect(service.deactivate('mission-1', Role.CLIENT)).rejects.toThrow(ForbiddenException);
    });
  });
});
