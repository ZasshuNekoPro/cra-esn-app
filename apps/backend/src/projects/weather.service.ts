import {
  Injectable,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WeatherState, ProjectStatus, AuditAction, Role } from '@esn/shared-types';
import type { CreateWeatherEntryRequest, WeatherMonthlySummary, RagIndexEvent } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const COMMENT_REQUIRED_STATES: WeatherState[] = [WeatherState.RAINY, WeatherState.STORM];

@Injectable()
export class WeatherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async createEntry(
    projectId: string,
    callerId: string,
    dto: Pick<CreateWeatherEntryRequest, 'date' | 'state' | 'comment'>,
  ) {
    // Verify caller is the project's employee
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, mission: { employeeId: callerId } },
      include: { mission: true },
    });

    if (!project) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce projet');
    }

    if (project.status === ProjectStatus.CLOSED) {
      throw new ConflictException('Impossible de modifier la météo d\'un projet fermé');
    }

    if (COMMENT_REQUIRED_STATES.includes(dto.state) && !dto.comment?.trim()) {
      throw new BadRequestException(
        `Un commentaire est obligatoire pour l'état ${dto.state}`,
      );
    }

    const entry = await this.prisma.weatherEntry.create({
      data: {
        projectId,
        state: dto.state as never,
        date: new Date(dto.date),
        comment: dto.comment ?? null,
        reportedById: callerId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.WEATHER_UPDATED,
        resource: `project:${projectId}`,
        metadata: { entryId: entry.id, state: dto.state },
        initiatorId: callerId,
      },
    });

    this.events.emit('rag.index.weather_entry', {
      employeeId: callerId,
      sourceType: 'weather_entry',
      sourceId: entry.id,
    } satisfies RagIndexEvent);

    return entry;
  }

  async getHistory(
    projectId: string,
    callerId: string,
    callerRole: Role,
    options?: { yearMonth?: string },
  ) {
    await this.assertProjectAccess(projectId, callerId, callerRole);

    const where: Record<string, unknown> = { projectId };

    if (options?.yearMonth) {
      const [year, month] = options.yearMonth.split('-').map(Number);
      const start = new Date(year, (month ?? 1) - 1, 1);
      const end = new Date(year, month ?? 1, 1);
      where['date'] = { gte: start, lt: end };
    }

    return this.prisma.weatherEntry.findMany({
      where,
      take: 30,
      orderBy: { date: 'desc' },
    });
  }

  async getMonthlySummary(
    projectId: string,
    callerId: string,
    callerRole: Role,
    year: number,
    month: number,
  ): Promise<WeatherMonthlySummary> {
    await this.assertProjectAccess(projectId, callerId, callerRole);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const entries = await this.prisma.weatherEntry.findMany({
      where: { projectId, date: { gte: start, lt: end } },
      select: { state: true },
    });

    const entryCounts: Partial<Record<WeatherState, number>> = {};
    for (const entry of entries) {
      const state = entry.state as unknown as WeatherState;
      entryCounts[state] = (entryCounts[state] ?? 0) + 1;
    }

    // STORM takes priority regardless of frequency
    const hasStorm = (entryCounts[WeatherState.STORM] ?? 0) > 0;

    let dominantState = WeatherState.SUNNY;
    if (hasStorm) {
      dominantState = WeatherState.STORM;
    } else if (entries.length > 0) {
      // Most frequent state
      let max = 0;
      for (const [state, count] of Object.entries(entryCounts) as [WeatherState, number][]) {
        if (count > max) {
          max = count;
          dominantState = state;
        }
      }
    }

    return {
      dominantState,
      stormCount: entryCounts[WeatherState.STORM] ?? 0,
      entryCounts,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async assertProjectAccess(
    projectId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<void> {
    let where: Record<string, unknown>;
    switch (callerRole) {
      case Role.EMPLOYEE:
        where = { id: projectId, mission: { employeeId: callerId } };
        break;
      case Role.ESN_ADMIN:
        where = { id: projectId, mission: { esnAdminId: callerId } };
        break;
      case Role.CLIENT:
        where = { id: projectId, mission: { clientId: callerId } };
        break;
      default:
        throw new NotFoundException('Projet introuvable');
    }

    const project = await this.prisma.project.findFirst({ where });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }
}
