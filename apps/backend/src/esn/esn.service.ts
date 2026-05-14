import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import type { CreateEsnDto } from './dto/create-esn.dto';
import type { UpdateEsnDto } from './dto/update-esn.dto';
import type { PlatformStats, AuditLogItem, AuditLogListResponse } from '@esn/shared-types';

const ESN_SELECT = {
  id: true,
  name: true,
  siret: true,
  address: true,
  logoUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  phone: true,
  avatarUrl: true,
  esnId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EsnService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.esn.findMany({
      select: ESN_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const esn = await this.prisma.esn.findUnique({
      where: { id },
      select: ESN_SELECT,
    });
    if (!esn) throw new NotFoundException(`ESN ${id} not found`);
    return esn;
  }

  async create(dto: CreateEsnDto) {
    return this.prisma.esn.create({
      data: {
        name: dto.name,
        siret: dto.siret ?? null,
        address: dto.address ?? null,
        logoUrl: dto.logoUrl ?? null,
      },
      select: ESN_SELECT,
    });
  }

  async update(id: string, dto: UpdateEsnDto) {
    const existing = await this.prisma.esn.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`ESN ${id} not found`);

    return this.prisma.esn.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.siret !== undefined && { siret: dto.siret }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
      select: ESN_SELECT,
    });
  }

  async getStats(): Promise<PlatformStats> {
    const [esnCount, esnAdminCount, employeeCount, clientCount, esnsWithUsers] = await Promise.all([
      this.prisma.esn.count(),
      this.prisma.user.count({
        where: { role: Role.ESN_ADMIN, deletedAt: null },
      }),
      this.prisma.user.count({ where: { role: Role.EMPLOYEE, deletedAt: null } }),
      this.prisma.user.count({ where: { role: Role.CLIENT, deletedAt: null } }),
      this.prisma.esn.findMany({
        select: {
          id: true,
          name: true,
          users: { where: { deletedAt: null }, select: { role: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const esnList = esnsWithUsers.map((esn) => ({
      id: esn.id,
      name: esn.name,
      adminCount: esn.users.filter(
        (u) => u.role === Role.ESN_ADMIN,
      ).length,
      employeeCount: esn.users.filter((u) => u.role === Role.EMPLOYEE).length,
      clientCount: esn.users.filter((u) => u.role === Role.CLIENT).length,
    }));

    return { esnCount, esnAdminCount, employeeCount, clientCount, esnList };
  }

  async findUsers(id: string) {
    const esn = await this.prisma.esn.findUnique({
      where: { id },
      select: {
        users: {
          where: { deletedAt: null },
          select: USER_SELECT,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!esn) throw new NotFoundException(`ESN ${id} not found`);
    return esn.users;
  }

  async getAuditLogs(params: {
    action?: string;
    initiatorId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogListResponse> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.initiatorId ? { initiatorId: params.initiatorId } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { initiator: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogItem[] = (rows as Array<{
      id: string;
      action: string;
      resource: string;
      metadata: unknown;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      initiatorId: string;
      initiator: { firstName: string; lastName: string; email: string };
    }>).map((r) => ({
      id: r.id,
      action: r.action,
      resource: r.resource,
      metadata: r.metadata as Record<string, unknown> | null,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
      initiatorId: r.initiatorId,
      initiatorName: `${r.initiator.firstName} ${r.initiator.lastName}`,
      initiatorEmail: r.initiator.email,
    }));

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }
}
