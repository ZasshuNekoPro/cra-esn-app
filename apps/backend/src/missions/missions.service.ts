import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@esn/shared-types';
import type { CreateMissionDto } from './dto/create-mission.dto';
import type { UpdateMissionDto } from './dto/update-mission.dto';

const EMPLOYEE_SELECT = { id: true, firstName: true, lastName: true, email: true } as const;

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
  employee: { select: EMPLOYEE_SELECT },
  missionEmployees: { select: { employee: { select: EMPLOYEE_SELECT } } },
  esnAdmin: { select: EMPLOYEE_SELECT },
  client: { select: EMPLOYEE_SELECT },
} as const;

type UserInfo = { id: string; firstName: string; lastName: string; email: string };

type RawMission = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  dailyRate: { toNumber(): number } | null;
  isActive: boolean;
  employeeId: string;
  esnAdminId: string | null;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
  employee: UserInfo;
  missionEmployees: { employee: UserInfo }[];
  esnAdmin: UserInfo | null;
  client: UserInfo | null;
};

type MappedMission = Omit<RawMission, 'missionEmployees'> & { employees: UserInfo[] };

function mapMission(raw: RawMission): MappedMission {
  const { missionEmployees, ...rest } = raw;
  return {
    ...rest,
    employees: missionEmployees.map((me) => me.employee),
  };
}

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMissionDto, callerId: string, callerRole: Role, _callerEsnId: string | null) {
    if (callerRole === Role.EMPLOYEE) {
      if (!dto.employeeIds.includes(callerId)) {
        throw new ForbiddenException('Employees can only create missions for themselves');
      }
    } else if (callerRole === Role.CLIENT) {
      if (!dto.clientId) {
        dto.clientId = callerId;
      } else if (dto.clientId !== callerId) {
        throw new ForbiddenException('Clients can only create missions where they are the client');
      }
    }

    const mission = await this.prisma.mission.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dailyRate: dto.dailyRate ?? null,
        employeeId: dto.employeeIds[0],
        esnAdminId: dto.esnAdminId ?? null,
        clientId: dto.clientId ?? null,
        missionEmployees: {
          createMany: { data: dto.employeeIds.map((employeeId) => ({ employeeId })) },
        },
      },
      select: MISSION_WITH_USERS,
    });
    return mapMission(mission as unknown as RawMission);
  }

  async findAll(callerId: string, callerRole: Role, callerEsnId: string | null) {
    const isEsnStaff = callerRole === Role.ESN_ADMIN;

    const where = isEsnStaff
      ? {
          isActive: true,
          ...(callerEsnId !== null ? { employee: { esnId: callerEsnId } } : {}),
        }
      : callerRole === Role.EMPLOYEE
        ? { isActive: true, missionEmployees: { some: { employeeId: callerId } } }
        : callerRole === Role.CLIENT
          ? { clientId: callerId, isActive: true }
          : {};

    const missions = await this.prisma.mission.findMany({
      where,
      select: MISSION_WITH_USERS,
      orderBy: { startDate: 'desc' },
    });
    return missions.map((m) => mapMission(m as unknown as RawMission));
  }

  async findOne(id: string, callerId: string, callerRole: Role) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      select: MISSION_WITH_USERS,
    });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);

    const raw = mission as unknown as RawMission;
    const isEsnStaff = callerRole === Role.ESN_ADMIN;
    const hasAccess =
      isEsnStaff ||
      raw.missionEmployees.some((me) => me.employee.id === callerId) ||
      raw.clientId === callerId;

    if (!hasAccess) throw new ForbiddenException('Access denied');
    return mapMission(raw);
  }

  async update(id: string, dto: UpdateMissionDto, callerRole: Role) {
    const isEsnStaff = callerRole === Role.ESN_ADMIN;
    if (!isEsnStaff) {
      throw new ForbiddenException('Only ESN staff can update missions');
    }
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);

    const updated = await this.prisma.mission.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.dailyRate !== undefined && { dailyRate: dto.dailyRate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId ?? null }),
        ...(dto.esnAdminId !== undefined && { esnAdminId: dto.esnAdminId ?? null }),
        ...(dto.employeeIds !== undefined && {
          employeeId: dto.employeeIds[0],
          missionEmployees: {
            deleteMany: {},
            createMany: { data: dto.employeeIds.map((employeeId) => ({ employeeId })) },
          },
        }),
      },
      select: MISSION_WITH_USERS,
    });
    return mapMission(updated as unknown as RawMission);
  }

  async deactivate(id: string, callerRole: Role): Promise<void> {
    const isEsnStaff = callerRole === Role.ESN_ADMIN;
    if (!isEsnStaff) {
      throw new ForbiddenException('Only ESN staff can deactivate missions');
    }
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException(`Mission ${id} not found`);
    await this.prisma.mission.update({ where: { id }, data: { isActive: false } });
  }
}
