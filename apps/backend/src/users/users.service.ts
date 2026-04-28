import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';

type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  company: string | null;
  avatarUrl: string | null;
  esnId: string | null;
  clientCompanyId: string | null;
  clientContactType: string | null;
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
  company: true,
  avatarUrl: true,
  esnId: true,
  clientCompanyId: true,
  clientContactType: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforce role-creation rules:
   * - PLATFORM_ADMIN can create ESN_ADMIN or ESN_MANAGER
   * - ESN_ADMIN and ESN_MANAGER can create EMPLOYEE or CLIENT
   */
  private assertCanCreate(callerRole: Role, targetRole: Role): void {
    if (callerRole === Role.PLATFORM_ADMIN) {
      if (targetRole !== Role.ESN_ADMIN && targetRole !== Role.ESN_MANAGER) {
        throw new ForbiddenException('Platform admin can only create ESN_ADMIN or ESN_MANAGER accounts');
      }
      return;
    }
    if (callerRole === Role.ESN_ADMIN || callerRole === Role.ESN_MANAGER) {
      if (targetRole !== Role.EMPLOYEE && targetRole !== Role.CLIENT) {
        throw new ForbiddenException('ESN staff can only create EMPLOYEE or CLIENT accounts');
      }
      return;
    }
    throw new ForbiddenException('Insufficient permissions to create users');
  }

  async create(dto: CreateUserDto, callerRole: Role, callerEsnId: string | null): Promise<PublicUser> {
    this.assertCanCreate(callerRole, dto.role);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already in use`);
    }

    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const hashed = await bcrypt.hash(dto.password, rounds);

    // ESN staff pass their own esnId to scope the created user.
    // PLATFORM_ADMIN can supply esnId explicitly (e.g. when creating ESN_MANAGER).
    const resolvedEsnId =
      callerRole === Role.ESN_ADMIN || callerRole === Role.ESN_MANAGER
        ? callerEsnId
        : (dto.esnId ?? null);

    if (dto.clientCompanyId && resolvedEsnId) {
      const company = await this.prisma.clientCompany.findFirst({
        where: { id: dto.clientCompanyId, esnId: resolvedEsnId },
        select: { id: true },
      });
      if (!company) throw new ForbiddenException('clientCompanyId does not belong to this ESN');
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        esnId: resolvedEsnId,
        clientCompanyId: dto.clientCompanyId ?? null,
        clientContactType: dto.clientContactType ?? null,
      },
      select: PUBLIC_SELECT,
    });
  }

  async findAll(callerRole: Role, callerEsnId: string | null): Promise<PublicUser[]> {
    if (callerRole === Role.PLATFORM_ADMIN) {
      return this.prisma.user.findMany({
        where: { deletedAt: null },
        select: PUBLIC_SELECT,
        orderBy: { createdAt: 'desc' },
      });
    }

    // ESN_ADMIN and ESN_MANAGER see only EMPLOYEE+CLIENT in their own ESN
    // If caller has no esnId, return empty list (misconfigured account)
    if (callerEsnId === null) return [];

    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        esnId: callerEsnId,
        role: { in: [Role.EMPLOYEE, Role.CLIENT] },
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

  async updateUser(
    targetId: string,
    dto: UpdateProfileDto,
    callerRole: Role,
    callerEsnId: string | null,
  ): Promise<PublicUser> {
    const target = await this.prisma.user.findUnique({ where: { id: targetId, deletedAt: null } });
    if (!target) throw new NotFoundException(`User ${targetId} not found`);

    if (target.role !== Role.EMPLOYEE && target.role !== Role.CLIENT) {
      throw new ForbiddenException('ESN staff can only edit EMPLOYEE or CLIENT accounts');
    }
    if (callerRole !== Role.PLATFORM_ADMIN) {
      if (callerEsnId === null) {
        throw new ForbiddenException('Your account is not scoped to an ESN');
      }
      if (target.esnId !== callerEsnId) {
        throw new ForbiddenException('User does not belong to your ESN');
      }
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
      },
      select: PUBLIC_SELECT,
    });
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
      },
      select: PUBLIC_SELECT,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const hashed = await bcrypt.hash(dto.newPassword, rounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }
}
