import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { MailerService } from './mailer.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  // ── Write ──────────────────────────────────────────────────────────────────

  async notify(userId: string, subject: string, body: string): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.IN_APP,
        subject,
        body,
        sentAt: new Date(),
      },
    });
  }

  /** Notify via EMAIL channel: persists to DB and dispatches real SMTP email. */
  async notifyEmail(userId: string, subject: string, body: string): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        channel: NotificationChannel.EMAIL,
        subject,
        body,
        sentAt: new Date(),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      const html = `<p>${body.replace(/\n/g, '<br>')}</p>`;
      await this.mailer.sendEmail(user.email, subject, html);
    }
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async listForUser(userId: string, unreadOnly: boolean) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async countUnread(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification introuvable');

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
