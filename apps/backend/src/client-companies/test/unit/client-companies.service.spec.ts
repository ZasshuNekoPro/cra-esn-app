import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClientCompaniesService } from '../../client-companies.service';
import { Role, ClientContactType } from '@esn/shared-types';
import type { CreateClientCompanyDto } from '../../dto/create-client-company.dto';

const mockTx = {
  clientCompany: { create: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn() },
};

const mockPrisma = {
  clientCompany: { findMany: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};

describe('ClientCompaniesService', () => {
  let service: ClientCompaniesService;

  const mockCompany = {
    id: 'company-1',
    name: 'ACME Corp',
    siren: '123456789',
    address: '123 Main St',
    website: 'https://acme.com',
    notes: 'Important client',
    esnId: 'esn-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'contact@acme.com',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.CLIENT,
    phone: '+1234567890',
    company: null,
    avatarUrl: null,
    esnId: 'esn-1',
    clientCompanyId: 'company-1',
    clientContactType: ClientContactType.RESPONSABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClientCompaniesService(mockPrisma as never);
    // reset $transaction to always call the callback with mockTx
    mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));
  });

  describe('create', () => {
    it('should create a client company with contacts inside a transaction', async () => {
      const createDto: CreateClientCompanyDto = {
        name: 'ACME Corp',
        siren: '123456789',
        address: '123 Main St',
        website: 'https://acme.com',
        notes: 'Important client',
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@acme.com',
            password: 'password123',
            contactType: ClientContactType.RESPONSABLE,
            phone: '+1234567890',
          },
        ],
      };

      mockTx.clientCompany.create.mockResolvedValue(mockCompany);
      mockTx.user.findUnique.mockResolvedValue(null);
      mockTx.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createDto, 'esn-1', Role.ESN_ADMIN);

      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();

      expect(mockTx.clientCompany.create).toHaveBeenCalledWith({
        data: {
          name: 'ACME Corp',
          siren: '123456789',
          address: '123 Main St',
          website: 'https://acme.com',
          notes: 'Important client',
          esnId: 'esn-1',
        },
      });

      expect(mockTx.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@acme.com' }, select: { id: true } });

      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'john@acme.com',
            firstName: 'John',
            lastName: 'Doe',
            role: Role.CLIENT,
            esnId: 'esn-1',
            clientCompanyId: mockCompany.id,
            clientContactType: ClientContactType.RESPONSABLE,
          }),
        }),
      );

      expect(result).toEqual({ ...mockCompany, contacts: [mockUser] });
    });

    it('should throw ConflictException and roll back if an email is already in use', async () => {
      const createDto: CreateClientCompanyDto = {
        name: 'ACME Corp',
        contacts: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'taken@acme.com',
            password: 'password123',
            contactType: ClientContactType.RH,
          },
        ],
      };

      mockTx.clientCompany.create.mockResolvedValue(mockCompany);
      mockTx.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(createDto, 'esn-1', Role.ESN_ADMIN)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all client companies for an ESN', async () => {
      const mockCompanies = [{ ...mockCompany, contacts: [mockUser] }];
      mockPrisma.clientCompany.findMany.mockResolvedValue(mockCompanies);

      const result = await service.findAll('esn-1');

      expect(mockPrisma.clientCompany.findMany).toHaveBeenCalledWith({
        where: { esnId: 'esn-1' },
        include: {
          contacts: {
            select: expect.objectContaining({ id: true, email: true, esnId: true }),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockCompanies);
    });
  });

  describe('findOne', () => {
    it('should return a single client company', async () => {
      const mockCompanyWithContacts = { ...mockCompany, contacts: [mockUser] };
      mockPrisma.clientCompany.findFirst.mockResolvedValue(mockCompanyWithContacts);

      const result = await service.findOne('company-1', 'esn-1');

      expect(mockPrisma.clientCompany.findFirst).toHaveBeenCalledWith({
        where: { id: 'company-1', esnId: 'esn-1' },
        include: {
          contacts: {
            select: expect.objectContaining({ id: true, email: true, esnId: true }),
          },
        },
      });

      expect(result).toEqual(mockCompanyWithContacts);
    });

    it('should throw NotFoundException when company is not found', async () => {
      mockPrisma.clientCompany.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'esn-1')).rejects.toThrow(NotFoundException);
    });
  });
});
