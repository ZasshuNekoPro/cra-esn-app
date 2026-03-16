import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
