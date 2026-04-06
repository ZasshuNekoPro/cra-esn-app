import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectStatus, ValidationStatus, MilestoneStatus, Role, AuditAction } from '@esn/shared-types';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectDetail,
  WeatherEntry,
} from '@esn/shared-types';
import type { ProjectSummary } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(callerId: string, dto: CreateProjectRequest) {
    const mission = await this.prisma.mission.findFirst({
      where: { id: dto.missionId, employeeId: callerId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable ou accès non autorisé');
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        estimatedDays: dto.estimatedDays ?? null,
        missionId: dto.missionId,
      },
    });
  }

  async findAllForClient(clientId: string): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: { mission: { clientId } },
      include: {
        weatherEntries: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        milestones: {
          where: { status: { not: MilestoneStatus.ARCHIVED as never } },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p): ProjectSummary => {
      const latestWeather: WeatherEntry | null =
        p.weatherEntries.length > 0
          ? (p.weatherEntries[0] as unknown as WeatherEntry)
          : null;
      const milestoneCount = p.milestones.length;
      const lateMilestoneCount = p.milestones.filter(
        (m) => (m.status as unknown as MilestoneStatus) === MilestoneStatus.LATE,
      ).length;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { weatherEntries: _w, milestones: _m, ...rest } = p;
      return {
        ...rest,
        status: p.status as unknown as ProjectStatus,
        latestWeather,
        milestoneCount,
        lateMilestoneCount,
      } as unknown as ProjectSummary;
    });
  }

  async findAllForEmployee(employeeId: string): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: { mission: { employeeId } },
      include: {
        weatherEntries: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        milestones: {
          where: { status: { not: MilestoneStatus.ARCHIVED as never } },
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p): ProjectSummary => {
      const latestWeather: WeatherEntry | null =
        p.weatherEntries.length > 0
          ? (p.weatherEntries[0] as unknown as WeatherEntry)
          : null;
      const milestoneCount = p.milestones.length;
      const lateMilestoneCount = p.milestones.filter(
        (m) => (m.status as unknown as MilestoneStatus) === MilestoneStatus.LATE,
      ).length;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { weatherEntries: _w, milestones: _m, ...rest } = p;
      return {
        ...rest,
        status: p.status as unknown as ProjectStatus,
        latestWeather,
        milestoneCount,
        lateMilestoneCount,
      } as unknown as ProjectSummary;
    });
  }

  async findOne(projectId: string, callerId: string, callerRole: Role): Promise<ProjectDetail> {
    const project = await this.prisma.project.findFirst({
      where: this.buildAccessWhere(projectId, callerId, callerRole),
      include: {
        mission: true,
        weatherEntries: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        milestones: {
          where: { status: { not: MilestoneStatus.ARCHIVED as never } },
          orderBy: { dueDate: 'asc' },
        },
        validationRequests: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const milestones = project.milestones.map((m) => ({
      ...m,
      isLate:
        m.dueDate != null &&
        m.dueDate < today &&
        (m.status as unknown as MilestoneStatus) !== MilestoneStatus.DONE,
    }));

    const pendingValidations = project.validationRequests.filter(
      (v) => (v.status as unknown as ValidationStatus) === ValidationStatus.PENDING,
    );

    return {
      ...project,
      status: project.status as unknown as ProjectStatus,
      weatherHistory: project.weatherEntries as never,
      milestones: milestones as never,
      pendingValidations: pendingValidations as never,
    };
  }

  async update(projectId: string, callerId: string, dto: UpdateProjectRequest) {
    await this.getOwnedActiveProject(projectId, callerId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.estimatedDays !== undefined && { estimatedDays: dto.estimatedDays }),
      },
    });
  }

  async pauseProject(projectId: string, callerId: string) {
    const project = await this.getOwnedProject(projectId, callerId);

    if ((project.status as unknown as ProjectStatus) !== ProjectStatus.ACTIVE) {
      throw new ConflictException('Seul un projet ACTIVE peut être mis en pause');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.PAUSED as never },
    });
  }

  async reopenProject(projectId: string, callerId: string) {
    const project = await this.getOwnedProject(projectId, callerId);

    if ((project.status as unknown as ProjectStatus) !== ProjectStatus.PAUSED) {
      throw new ConflictException('Seul un projet PAUSED peut être réouvert');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ACTIVE as never },
    });
  }

  async closeProject(projectId: string, callerId: string) {
    const project = await this.getOwnedProject(projectId, callerId);

    if ((project.status as unknown as ProjectStatus) === ProjectStatus.CLOSED) {
      throw new ConflictException('Le projet est déjà fermé');
    }

    await this.prisma.$transaction([
      this.prisma.projectValidationRequest.updateMany({
        where: { projectId, status: ValidationStatus.PENDING as never },
        data: {
          status: ValidationStatus.ARCHIVED as never,
          decisionComment: 'Projet fermé',
          resolvedAt: new Date(),
        },
      }),
      this.prisma.milestone.updateMany({
        where: {
          projectId,
          status: {
            in: [
              MilestoneStatus.PLANNED,
              MilestoneStatus.IN_PROGRESS,
              MilestoneStatus.LATE,
            ] as never[],
          },
        },
        data: { status: MilestoneStatus.ARCHIVED as never },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.CLOSED as never,
          closedAt: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.PROJECT_CLOSED,
          resource: `project:${projectId}`,
          initiatorId: callerId,
        },
      }),
    ]);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildAccessWhere(projectId: string, callerId: string, callerRole: Role) {
    switch (callerRole) {
      case Role.EMPLOYEE:
        return { id: projectId, mission: { employeeId: callerId } };
      case Role.ESN_ADMIN:
        // ConsentGuard already verified; ESN can see all projects on their managed missions
        return { id: projectId, mission: { esnAdminId: callerId } };
      case Role.ESN_MANAGER:
        return { id: projectId, mission: { esnAdminId: callerId } };
      case Role.CLIENT:
        return { id: projectId, mission: { clientId: callerId } };
      default:
        throw new ForbiddenException('Accès non autorisé');
    }
  }

  private async getOwnedProject(projectId: string, callerId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, mission: { employeeId: callerId } },
      include: { mission: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable ou accès non autorisé');
    return project;
  }

  private async getOwnedActiveProject(projectId: string, callerId: string) {
    const project = await this.getOwnedProject(projectId, callerId);
    if ((project.status as unknown as ProjectStatus) === ProjectStatus.CLOSED) {
      throw new ConflictException('Impossible de modifier un projet fermé');
    }
    return project;
  }
}
