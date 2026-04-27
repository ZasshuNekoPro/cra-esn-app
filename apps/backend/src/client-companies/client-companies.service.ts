import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import * as bcrypt from 'bcryptjs';
import type { CreateClientCompanyDto } from './dto/create-client-company.dto';

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
}