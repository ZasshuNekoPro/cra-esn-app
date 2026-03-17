import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Notify via EMAIL channel (persisted to DB; SMTP dispatch handled by external mailer). */
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
