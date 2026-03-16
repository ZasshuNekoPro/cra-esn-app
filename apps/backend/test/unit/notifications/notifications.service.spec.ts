import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from '../../../src/notifications/notifications.service';
import { NotificationChannel } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const makePrisma = () =>
  ({
    notification: {
      create: vi.fn(),
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
});
