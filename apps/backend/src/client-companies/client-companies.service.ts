import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import * as bcrypt from 'bcryptjs';
import type { CreateClientCompanyDto, CreateContactDto } from './dto/create-client-company.dto';

const CONTACT_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  company: true,
  avatarUrl: true,
  esnId: true,
  clientCompanyId: true,
  clientContactType: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ClientCompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientCompanyDto, esnId: string, _callerRole: Role) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.clientCompany.create({
        data: {
          name: dto.name,
          siren: dto.siren ?? null,
          address: dto.address ?? null,
          website: dto.website ?? null,
          notes: dto.notes ?? null,
          esnId,
        },
      });

      const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);

      const contacts = await Promise.all(
        dto.contacts.map(async (contactDto) => {
          const existing = await tx.user.findUnique({ where: { email: contactDto.email }, select: { id: true } });
          if (existing) throw new ConflictException(`Email ${contactDto.email} is already in use`);
          const hashed = await bcrypt.hash(contactDto.password, rounds);
          return tx.user.create({
            data: {
              email: contactDto.email,
              password: hashed,
              firstName: contactDto.firstName,
              lastName: contactDto.lastName,
              role: Role.CLIENT,
              phone: contactDto.phone ?? null,
              esnId,
              clientCompanyId: company.id,
              clientContactType: contactDto.contactType,
            },
            select: CONTACT_SELECT,
          });
        }),
      );

      return { ...company, contacts };
    });
  }

  async findAll(esnId: string) {
    return this.prisma.clientCompany.findMany({
      where: { esnId },
      include: { contacts: { select: CONTACT_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, esnId: string) {
    const company = await this.prisma.clientCompany.findFirst({
      where: { id, esnId },
      include: { contacts: { select: CONTACT_SELECT } },
    });

    if (!company) {
      throw new NotFoundException(`Client company ${id} not found`);
    }

    return company;
  }

  async addContact(companyId: string, esnId: string, dto: CreateContactDto) {
    const company = await this.prisma.clientCompany.findFirst({
      where: { id: companyId, esnId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException(`Client company ${companyId} not found`);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new ConflictException(`Email ${dto.email} is already in use`);

    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: Role.CLIENT,
        phone: dto.phone ?? null,
        esnId,
        clientCompanyId: companyId,
        clientContactType: dto.contactType,
      },
      select: CONTACT_SELECT,
    });
  }

  async update(id: string, esnId: string, dto: Partial<{ name: string; siren: string; address: string; website: string; notes: string }>) {
    const existing = await this.prisma.clientCompany.findFirst({ where: { id, esnId }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Client company ${id} not found`);

    return this.prisma.clientCompany.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.siren !== undefined && { siren: dto.siren || null }),
        ...(dto.address !== undefined && { address: dto.address || null }),
        ...(dto.website !== undefined && { website: dto.website || null }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
      },
      include: { contacts: { select: CONTACT_SELECT } },
    });
  }
}