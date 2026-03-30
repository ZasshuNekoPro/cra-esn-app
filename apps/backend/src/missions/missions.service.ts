import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import type { CreateMissionDto } from './dto/create-mission.dto';
import type { UpdateMissionDto } from './dto/update-mission.dto';

const MISSION_WITH_USERS = {
  id: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  dailyRate: true,
  isActive: true,
  employeeId: true,
  esnAdminId: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { id: true, firstName: true, lastName: true, email: true } },
  esnAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
  client: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMissionDto, callerId: string, callerRole: Role) {
    // Enforce role rules
    if (callerRole === Role.EMPLOYEE) {
      // Employee can only create missions where they are the employee
      if (dto.employeeId !== callerId) {
        throw new ForbiddenException('Employees can only create missions for themselves');
      }
    } else if (callerRole === Role.CLIENT) {
      // Client must be set as clientId
      if (!dto.clientId) {
        dto.clientId = callerId;
      } else if (dto.clientId !== callerId) {
        throw new ForbiddenException('Clients can only create missions where they are the client');
      }
    }

    return this.prisma.mission.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dailyRate: dto.dailyRate ?? null,
        employeeId: dto.employeeId,
        esnAdminId: dto.esnAdminId ?? null,
        clientId: dto.clientId ?? null,
      },
      select: MISSION_WITH_USERS,
    });
  }

  async findAll(callerId: string, callerRole: Role) {
    const where =
      callerRole === Role.ESN_ADMIN
        ? { isActive: true }
        : callerRole === Role.EMPLOYEE
          ? { employeeId: callerId, isActive: true }
          : callerRole === Role.CLIENT
            ? { clientId: callerId, isActive: true }
            : {};

    return this.prisma.mission.findMany({
      where,
      select: MISSION_WITH_USERS,
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, callerId: string, callerRole: Role) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      select: MISSION_WITH_USERS,
    });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);

    const hasAccess =
      callerRole === Role.ESN_ADMIN ||
      mission.employeeId === callerId ||
      mission.clientId === callerId;

    if (!hasAccess) throw new ForbiddenException('Access denied');
    return mission;
  }

  async update(id: string, dto: UpdateMissionDto, callerRole: Role) {
    if (callerRole !== Role.ESN_ADMIN) {
      throw new ForbiddenException('Only ESN admins can update missions');
    }
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);

    return this.prisma.mission.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.dailyRate !== undefined && { dailyRate: dto.dailyRate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: MISSION_WITH_USERS,
    });
  }

  async deactivate(id: string, callerRole: Role): Promise<void> {
    if (callerRole !== Role.ESN_ADMIN) {
      throw new ForbiddenException('Only ESN admins can deactivate missions');
    }
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);
    await this.prisma.mission.update({ where: { id }, data: { isActive: false } });
  }
}
