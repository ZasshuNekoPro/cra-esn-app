import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@esn/shared-types';
import { EsnService } from '../../esn.service';

const mockPrisma = {
  esn: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
};

const makeEsn = (overrides = {}) => ({
  id: 'esn-uuid',
  name: 'Acme ESN',
  siret: '12345678901234',
  address: '1 rue de la Paix, Paris',
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('EsnService', () => {
  let service: EsnService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EsnService(mockPrisma as never);
  });

  describe('findAll', () => {
    it('returns all ESN companies', async () => {
      const esns = [makeEsn(), makeEsn({ id: 'esn-uuid-2', name: 'Beta ESN' })];
      mockPrisma.esn.findMany.mockResolvedValue(esns);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(mockPrisma.esn.findMany).toHaveBeenCalledOnce();
    });
  });

  describe('findOne', () => {
    it('returns an ESN by id', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(makeEsn());
      const result = await service.findOne('esn-uuid');
      expect(result.id).toBe('esn-uuid');
    });

    it('throws NotFoundException when ESN not found', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates an ESN company', async () => {
      const dto = { name: 'New ESN', siret: '99999999999999' };
      mockPrisma.esn.create.mockResolvedValue(makeEsn({ name: dto.name, siret: dto.siret }));
      const result = await service.create(dto);
      expect(mockPrisma.esn.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'New ESN' }) }),
      );
      expect(result.name).toBe('New ESN');
    });
  });

  describe('update', () => {
    it('updates an existing ESN', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(makeEsn());
      mockPrisma.esn.update.mockResolvedValue(makeEsn({ name: 'Updated ESN' }));
      const result = await service.update('esn-uuid', { name: 'Updated ESN' });
      expect(result.name).toBe('Updated ESN');
    });

    it('throws NotFoundException when ESN not found on update', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('returns platform-wide statistics', async () => {
      mockPrisma.esn.count.mockResolvedValue(2);
      mockPrisma.user.count
        .mockResolvedValueOnce(3)  // ESN_ADMIN
        .mockResolvedValueOnce(10) // EMPLOYEE
        .mockResolvedValueOnce(4); // CLIENT
      mockPrisma.esn.findMany.mockResolvedValue([
        { id: 'esn-1', name: 'Acme ESN', users: [{ role: Role.ESN_ADMIN }, { role: Role.EMPLOYEE }, { role: Role.CLIENT }] },
        { id: 'esn-2', name: 'Beta ESN', users: [{ role: Role.EMPLOYEE }] },
      ]);

      const result = await service.getStats();

      expect(result.esnCount).toBe(2);
      expect(result.esnAdminCount).toBe(3);
      expect(result.employeeCount).toBe(10);
      expect(result.clientCount).toBe(4);
      expect(result.esnList).toHaveLength(2);
    });

    it('computes per-ESN role counts correctly', async () => {
      mockPrisma.esn.count.mockResolvedValue(1);
      mockPrisma.user.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);
      mockPrisma.esn.findMany.mockResolvedValue([
        {
          id: 'esn-1',
          name: 'Acme ESN',
          users: [
            { role: Role.ESN_ADMIN },
            { role: Role.EMPLOYEE },
            { role: Role.EMPLOYEE },
            { role: Role.CLIENT },
          ],
        },
      ]);

      const result = await service.getStats();
      const esn = result.esnList[0];

      expect(esn.adminCount).toBe(1);
      expect(esn.employeeCount).toBe(2);
      expect(esn.clientCount).toBe(1);
    });

    it('returns empty esnList when no ESN exists', async () => {
      mockPrisma.esn.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.esn.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.esnCount).toBe(0);
      expect(result.esnList).toHaveLength(0);
    });
  });

  describe('findUsers', () => {
    it('finds users belonging to an ESN', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(makeEsn({ users: [{ id: 'u1' }, { id: 'u2' }] }));
      const result = await service.findUsers('esn-uuid');
      expect(result).toHaveLength(2);
    });

    it('throws NotFoundException when ESN not found', async () => {
      mockPrisma.esn.findUnique.mockResolvedValue(null);
      await expect(service.findUsers('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
