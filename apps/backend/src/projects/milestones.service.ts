import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MilestoneStatus } from '@esn/shared-types';
import type { CreateMilestoneRequest, UpdateMilestoneRequest, CompleteMilestoneRequest, RagIndexEvent } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const TERMINAL_STATUSES: MilestoneStatus[] = [MilestoneStatus.DONE, MilestoneStatus.ARCHIVED];

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async createMilestone(projectId: string, callerId: string, dto: CreateMilestoneRequest) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, mission: { employeeId: callerId } },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Projet introuvable ou accès non autorisé');
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        projectId,
        createdById: callerId,
      },
    });

    this.events.emit('rag.index.milestone', {
      employeeId: callerId,
      sourceType: 'milestone',
      sourceId: milestone.id,
    } satisfies RagIndexEvent);

    return milestone;
  }

  async getMilestones(projectId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId, status: { not: MilestoneStatus.ARCHIVED as never } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async updateMilestone(milestoneId: string, callerId: string, dto: UpdateMilestoneRequest) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, project: { mission: { employeeId: callerId } } },
    });

    if (!milestone) {
      throw new NotFoundException('Jalon introuvable ou accès non autorisé');
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.status !== undefined && { status: dto.status as never }),
      },
    });

    this.events.emit('rag.index.milestone', {
      employeeId: callerId,
      sourceType: 'milestone',
      sourceId: milestoneId,
    } satisfies RagIndexEvent);

    return updated;
  }

  async completeMilestone(milestoneId: string, callerId: string, dto: CompleteMilestoneRequest) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, project: { mission: { employeeId: callerId } } },
    });

    if (!milestone) {
      throw new NotFoundException('Jalon introuvable ou accès non autorisé');
    }

    if (TERMINAL_STATUSES.includes(milestone.status as unknown as MilestoneStatus)) {
      throw new ConflictException('Ce jalon ne peut plus être modifié');
    }

    const completed = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.DONE as never,
        completedAt: new Date(),
        ...(dto.validatedAt && { validatedAt: new Date(dto.validatedAt) }),
      },
    });

    this.events.emit('rag.index.milestone', {
      employeeId: callerId,
      sourceType: 'milestone',
      sourceId: milestoneId,
    } satisfies RagIndexEvent);

    return completed;
  }
}
