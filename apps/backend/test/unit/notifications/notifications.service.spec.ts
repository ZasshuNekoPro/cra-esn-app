import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../../src/notifications/notifications.service';
import { NotificationChannel } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const makePrisma = () =>
  ({
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  }) as unknown as PrismaService;

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationsService(prisma as unknown as PrismaService);
    vi.clearAllMocks();
  });

  it('should create an in-app Notification for the target user', async () => {
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-uuid-1',
      userId: 'user-uuid-1',
      channel: NotificationChannel.IN_APP,
      subject: 'Test subject',
      body: 'Test body',
      isRead: false,
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date(),
    } as never);

    await service.notify('user-uuid-1', 'Test subject', 'Test body');

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-uuid-1',
          channel: NotificationChannel.IN_APP,
          subject: 'Test subject',
          body: 'Test body',
        }),
      }),
    );
  });

  it('should not throw if user has no active session', async () => {
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-uuid-2',
      userId: 'offline-user-uuid',
      channel: NotificationChannel.IN_APP,
      subject: 'Background subject',
      body: 'Background body',
      isRead: false,
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date(),
    } as never);

    // Should resolve without throwing even if user is not online
    await expect(
      service.notify('offline-user-uuid', 'Background subject', 'Background body'),
    ).resolves.toBeUndefined();
  });

  it('should store subject and body', async () => {
    const subject = 'Nouveau CRA à valider';
    const body = 'Le salarié Jean Dupont a soumis son CRA pour Mars 2026.';

    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-uuid-3',
      userId: 'esn-admin-uuid',
      channel: NotificationChannel.IN_APP,
      subject,
      body,
      isRead: false,
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date(),
    } as never);

    await service.notify('esn-admin-uuid', subject, body);

    const callArg = vi.mocked(prisma.notification.create).mock.calls[0][0] as {
      data: { subject: string; body: string };
    };
    expect(callArg.data.subject).toBe(subject);
    expect(callArg.data.body).toBe(body);
  });

  it('notifyEmail creates an EMAIL channel notification', async () => {
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    await service.notifyEmail('user-uuid-1', 'Email subject', 'Email body');

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channel: NotificationChannel.EMAIL }),
      }),
    );
  });

  describe('listForUser', () => {
    it('returns all notifications when unreadOnly=false', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      await service.listForUser('user-1', false);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('filters unread when unreadOnly=true', async () => {
      vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
      await service.listForUser('user-1', true);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', isRead: false } }),
      );
    });
  });

  describe('countUnread', () => {
    it('returns unreadCount', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(7);
      const result = await service.countUnread('user-1');
      expect(result).toEqual({ unreadCount: 7 });
    });
  });

  describe('markRead', () => {
    it('throws NotFoundException when notification not found or not owned', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
      await expect(service.markRead('notif-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('marks notification as read', async () => {
      vi.mocked(prisma.notification.findFirst).mockResolvedValue({ id: 'notif-id' } as never);
      vi.mocked(prisma.notification.update).mockResolvedValue({} as never);
      await service.markRead('notif-id', 'user-1');
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-id' },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });

  describe('markAllRead', () => {
    it('updates all unread for user', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as never);
      await service.markAllRead('user-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });
});
