import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagSchedulerService } from '../../../src/rag/rag-scheduler.service';
import { Role } from '@esn/shared-types';

const mockPrisma = {
  user: {
    findMany: vi.fn(),
  },
};

const mockNotifications = {
  notify: vi.fn(),
};

function makeService(): RagSchedulerService {
  return new RagSchedulerService(
    mockPrisma as never,
    mockNotifications as never,
  );
}

describe('RagSchedulerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a notification to each employee', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'emp-1', firstName: 'Alice' },
      { id: 'emp-2', firstName: 'Bob' },
    ]);
    mockNotifications.notify.mockResolvedValue(undefined);

    const svc = makeService();
    await svc.sendWeeklyDigest();

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.EMPLOYEE as never },
      select: { id: true, firstName: true },
    });
    expect(mockNotifications.notify).toHaveBeenCalledTimes(2);
    expect(mockNotifications.notify).toHaveBeenCalledWith(
      'emp-1',
      expect.stringContaining('Récapitulatif hebdomadaire'),
      expect.stringContaining('Alice'),
    );
    expect(mockNotifications.notify).toHaveBeenCalledWith(
      'emp-2',
      expect.stringContaining('Récapitulatif hebdomadaire'),
      expect.stringContaining('Bob'),
    );
  });

  it('continues notifying remaining employees when one fails', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'emp-1', firstName: 'Alice' },
      { id: 'emp-2', firstName: 'Bob' },
    ]);
    mockNotifications.notify
      .mockRejectedValueOnce(new Error('SMTP failure'))
      .mockResolvedValueOnce(undefined);

    const svc = makeService();
    await expect(svc.sendWeeklyDigest()).resolves.toBeUndefined();

    expect(mockNotifications.notify).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there are no employees', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const svc = makeService();
    await svc.sendWeeklyDigest();

    expect(mockNotifications.notify).not.toHaveBeenCalled();
  });
});
