import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectSchedulerService } from '../../../src/projects/scheduler.service';
import { WeatherState, MilestoneStatus, ProjectStatus } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { NotificationsService } from '../../../src/notifications/notifications.service';

const projectId = 'project-uuid-1';
const employeeId = 'employee-uuid-1';
const esnAdminId = 'esnadmin-uuid-1';
const milestoneId = 'milestone-uuid-1';

const mockPrisma = {
  project: {
    findMany: vi.fn(),
  },
  weatherEntry: {
    create: vi.fn(),
  },
  milestone: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $queryRaw: vi.fn(),
} satisfies Partial<PrismaService> as unknown as PrismaService;

const mockNotifications = {
  notify: vi.fn(),
} satisfies Partial<NotificationsService> as unknown as NotificationsService;

describe('ProjectSchedulerService', () => {
  let service: ProjectSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProjectSchedulerService(mockPrisma, mockNotifications);
  });

  describe('escalateStaleRainy', () => {
    it('should escalate RAINY project with no new entry in 3+ days to STORM', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 5); // 5 days ago

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([
        {
          id: projectId,
          mission: { employeeId, esnAdminId },
        },
      ] as never);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
        { projectId, state: WeatherState.RAINY, date: staleDate },
      ] as never);
      vi.mocked(mockPrisma.weatherEntry.create).mockResolvedValue({} as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      await service.escalateStaleRainy();

      expect(mockPrisma.weatherEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: WeatherState.STORM, projectId }),
        }),
      );
      expect(mockNotifications.notify).toHaveBeenCalledWith(
        esnAdminId,
        expect.any(String),
        expect.any(String),
      );
    });

    it('should NOT escalate if last entry is recent (within 3 working days)', async () => {
      const recentDate = new Date(); // today

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([
        { id: projectId, mission: { employeeId, esnAdminId } },
      ] as never);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
        { projectId, state: WeatherState.RAINY, date: recentDate },
      ] as never);

      await service.escalateStaleRainy();

      expect(mockPrisma.weatherEntry.create).not.toHaveBeenCalled();
    });

    it('should NOT escalate if last weather state is not RAINY', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 5);

      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([
        { id: projectId, mission: { employeeId, esnAdminId } },
      ] as never);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([
        { projectId, state: WeatherState.SUNNY, date: staleDate },
      ] as never);

      await service.escalateStaleRainy();

      expect(mockPrisma.weatherEntry.create).not.toHaveBeenCalled();
    });

    it('should skip projects with no weather entries', async () => {
      vi.mocked(mockPrisma.project.findMany).mockResolvedValue([
        { id: projectId, mission: { employeeId, esnAdminId } },
      ] as never);
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([] as never);

      await service.escalateStaleRainy();

      expect(mockPrisma.weatherEntry.create).not.toHaveBeenCalled();
    });
  });

  describe('markLateMilestones', () => {
    it('should mark overdue PLANNED/IN_PROGRESS milestones as LATE', async () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 1);

      vi.mocked(mockPrisma.milestone.findMany).mockResolvedValue([
        {
          id: milestoneId,
          dueDate: pastDue,
          status: MilestoneStatus.PLANNED,
          project: { id: projectId, status: ProjectStatus.ACTIVE },
        },
      ] as never);
      vi.mocked(mockPrisma.milestone.updateMany).mockResolvedValue({ count: 1 } as never);

      await service.markLateMilestones();

      expect(mockPrisma.milestone.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: expect.arrayContaining([MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS]) },
          }),
          data: { status: MilestoneStatus.LATE },
        }),
      );
    });

    it('should not update when no overdue milestones found', async () => {
      vi.mocked(mockPrisma.milestone.findMany).mockResolvedValue([] as never);

      await service.markLateMilestones();

      expect(mockPrisma.milestone.updateMany).not.toHaveBeenCalled();
    });
  });
});
