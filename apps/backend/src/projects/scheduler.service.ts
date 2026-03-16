import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeatherState, MilestoneStatus, ProjectStatus, AuditAction } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Number of calendar days after which a RAINY state is considered stale. */
const RAINY_STALE_DAYS = 3;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

@Injectable()
export class ProjectSchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Daily cron: if the last WeatherEntry of an ACTIVE project is RAINY and is
   * older than RAINY_STALE_DAYS calendar days, auto-escalate to STORM and
   * notify the ESN admin.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async escalateStaleRainy(): Promise<void> {
    const activeProjects = await this.prisma.project.findMany({
      where: { status: ProjectStatus.ACTIVE as never },
      select: { id: true, mission: { select: { employeeId: true, esnAdminId: true } } },
    });

    const today = new Date();

    for (const project of activeProjects) {
      const lastEntry = await this.prisma.weatherEntry.findFirst({
        where: { projectId: project.id },
        orderBy: { date: 'desc' },
        select: { state: true, date: true },
      });

      if (!lastEntry) continue;
      if ((lastEntry.state as unknown as WeatherState) !== WeatherState.RAINY) continue;
      if (daysBetween(lastEntry.date, today) < RAINY_STALE_DAYS) continue;

      // Auto-escalate to STORM
      await this.prisma.weatherEntry.create({
        data: {
          projectId: project.id,
          state: WeatherState.STORM as never,
          date: today,
          comment: `Escalade automatique : météo RAINY sans mise à jour depuis ${RAINY_STALE_DAYS} jours`,
          reportedById: project.mission.employeeId,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.WEATHER_UPDATED,
          resource: `project:${project.id}`,
          metadata: { autoEscalation: true, from: 'RAINY', to: 'STORM' },
          initiatorId: project.mission.employeeId,
        },
      });

      if (project.mission.esnAdminId) {
        await this.notifications.notify(
          project.mission.esnAdminId,
          '⚠️ Alerte météo projet — escalade automatique STORM',
          `Le projet ${project.id} est passé automatiquement en état STORM suite à l'absence de mise à jour depuis ${RAINY_STALE_DAYS} jours.`,
        );
      }
    }
  }

  /**
   * Daily cron: mark PLANNED/IN_PROGRESS milestones as LATE when dueDate has passed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async markLateMilestones(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.milestone.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: [MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS] as never[] },
        project: { status: { not: ProjectStatus.CLOSED as never } },
      },
      select: { id: true },
    });

    if (overdue.length === 0) return;

    const overdueIds = overdue.map((m) => m.id);

    await this.prisma.milestone.updateMany({
      where: {
        id: { in: overdueIds },
        status: { in: [MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS] as never[] },
      },
      data: { status: MilestoneStatus.LATE as never },
    });
  }
}
