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
  esnReferentId: string | null;
  canSeeAllEsnReports: boolean;
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
  esnReferentId: true,
  canSeeAllEsnReports: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforce role-creation rules:
   * - PLATFORM_ADMIN can create ESN_ADMIN
   * - ESN_ADMIN can create EMPLOYEE or CLIENT
   */
  private assertCanCreate(callerRole: Role, targetRole: Role): void {
    if (callerRole === Role.PLATFORM_ADMIN) {
      if (targetRole !== Role.ESN_ADMIN) {
        throw new ForbiddenException('Platform admin can only create ESN_ADMIN accounts');
      }
      return;
    }
    if (callerRole === Role.ESN_ADMIN) {
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

    const resolvedEsnId =
      callerRole === Role.ESN_ADMIN
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

    // ESN_ADMIN sees only EMPLOYEE+CLIENT in their own ESN
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

  async setEsnReferent(
    employeeId: string,
    referentId: string | null,
    callerRole: Role,
    callerEsnId: string | null,
  ): Promise<PublicUser> {
    const employee = await this.prisma.user.findUnique({ where: { id: employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundException(`User ${employeeId} not found`);
    if (employee.role !== Role.EMPLOYEE) {
      throw new ForbiddenException('esnReferentId can only be set on EMPLOYEE accounts');
    }
    if (callerRole !== Role.PLATFORM_ADMIN && employee.esnId !== callerEsnId) {
      throw new ForbiddenException('User does not belong to your ESN');
    }

    if (referentId !== null) {
      const referent = await this.prisma.user.findUnique({ where: { id: referentId, deletedAt: null } });
      if (!referent || referent.role !== Role.ESN_ADMIN) {
        throw new NotFoundException(`ESN admin ${referentId} not found`);
      }
      if (callerRole !== Role.PLATFORM_ADMIN && referent.esnId !== callerEsnId) {
        throw new ForbiddenException('Referent does not belong to your ESN');
      }
    }

    return this.prisma.user.update({
      where: { id: employeeId },
      data: { esnReferentId: referentId },
      select: PUBLIC_SELECT,
    });
  }

  async setCanSeeAllReports(
    targetAdminId: string,
    value: boolean,
    callerRole: Role,
    callerEsnId: string | null,
  ): Promise<PublicUser> {
    const target = await this.prisma.user.findUnique({ where: { id: targetAdminId, deletedAt: null } });
    if (!target) throw new NotFoundException(`User ${targetAdminId} not found`);
    if (target.role !== Role.ESN_ADMIN) {
      throw new ForbiddenException('canSeeAllEsnReports can only be set on ESN_ADMIN accounts');
    }
    if (callerRole !== Role.PLATFORM_ADMIN && target.esnId !== callerEsnId) {
      throw new ForbiddenException('Admin does not belong to your ESN');
    }

    return this.prisma.user.update({
      where: { id: targetAdminId },
      data: { canSeeAllEsnReports: value },
      select: PUBLIC_SELECT,
    });
  }

  async listEsnAdmins(callerEsnId: string | null): Promise<{ id: string; firstName: string; lastName: string }[]> {
    if (callerEsnId === null) return [];
    return this.prisma.user.findMany({
      where: { deletedAt: null, esnId: callerEsnId, role: Role.ESN_ADMIN },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
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
