import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Weekly cron: every Monday at 08:00 */
const MONDAY_AT_8AM = '0 8 * * 1';

@Injectable()
export class RagSchedulerService {
  private readonly logger = new Logger(RagSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Every Monday at 08:00, send a weekly digest suggestion to all active employees.
   * The suggestion nudges the employee to review their CRA and project status for the week.
   */
  @Cron(MONDAY_AT_8AM)
  async sendWeeklyDigest(): Promise<void> {
    const employees = await this.prisma.user.findMany({
      where: { role: Role.EMPLOYEE as never },
      select: { id: true, firstName: true },
    });

    this.logger.log(`Sending weekly RAG digest to ${employees.length} employees`);

    for (const employee of employees) {
      const subject = 'Récapitulatif hebdomadaire — Votre assistant IA';
      const body = `Bonjour ${employee.firstName},\n\nUne nouvelle semaine commence ! N'oubliez pas de :\n• Saisir vos jours travaillés dans votre CRA\n• Mettre à jour la météo de vos projets actifs\n• Consulter l'Assistant IA pour un bilan de votre activité récente\n\nBonne semaine !`;

      try {
        await this.notifications.notify(employee.id, subject, body);
      } catch (err) {
        this.logger.error(`Failed to notify employee ${employee.id}: ${String(err)}`);
      }
    }
  }
}
