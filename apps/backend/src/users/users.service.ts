import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import type { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforce role-creation rules:
   * - PLATFORM_ADMIN can create ESN_ADMIN only
   * - ESN_ADMIN can create EMPLOYEE or CLIENT
   */
  private assertCanCreate(callerRole: Role, targetRole: Role): void {
    if (callerRole === Role.PLATFORM_ADMIN && targetRole !== Role.ESN_ADMIN) {
      throw new ForbiddenException('Platform admin can only create ESN_ADMIN accounts');
    }
    if (callerRole === Role.ESN_ADMIN && targetRole !== Role.EMPLOYEE && targetRole !== Role.CLIENT) {
      throw new ForbiddenException('ESN admin can only create EMPLOYEE or CLIENT accounts');
    }
    if (callerRole !== Role.PLATFORM_ADMIN && callerRole !== Role.ESN_ADMIN) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }
  }

  async create(dto: CreateUserDto, callerRole: Role): Promise<PublicUser> {
    this.assertCanCreate(callerRole, dto.role);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already in use`);
    }

    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone ?? null,
      },
      select: PUBLIC_SELECT,
    });
  }

  async findAll(callerRole: Role): Promise<PublicUser[]> {
    const roleFilter =
      callerRole === Role.PLATFORM_ADMIN
        ? undefined
        : { in: [Role.EMPLOYEE, Role.CLIENT] };

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: PUBLIC_SELECT,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
