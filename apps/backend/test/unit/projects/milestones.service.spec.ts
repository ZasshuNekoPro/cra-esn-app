import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MilestonesService } from '../../../src/projects/milestones.service';
import { MilestoneStatus } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'employee-uuid-1';
const projectId = 'project-uuid-1';
const milestoneId = 'milestone-uuid-1';

const mockMilestone = {
  id: milestoneId,
  title: 'Livraison v1',
  description: null,
  dueDate: new Date('2026-04-01'),
  status: MilestoneStatus.PLANNED,
  completedAt: null,
  validatedAt: null,
  projectId,
  createdById: employeeId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  milestone: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  project: {
    findFirst: vi.fn(),
  },
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('MilestonesService', () => {
  let service: MilestonesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MilestonesService(mockPrisma);
  });

  describe('createMilestone', () => {
    it('should create a milestone on an owned project', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue({ id: projectId } as never);
      vi.mocked(mockPrisma.milestone.create).mockResolvedValue(mockMilestone as never);

      const result = await service.createMilestone(projectId, employeeId, {
        title: 'Livraison v1',
        dueDate: '2026-04-01',
      });

      expect(result.title).toBe('Livraison v1');
      expect(mockPrisma.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId, createdById: employeeId }),
        }),
      );
    });

    it('should throw NotFoundException if project not found or not owned', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(null);

      await expect(
        service.createMilestone(projectId, 'intruder', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMilestones', () => {
    it('should return milestones ordered by dueDate asc, excluding ARCHIVED', async () => {
      vi.mocked(mockPrisma.milestone.findMany).mockResolvedValue([mockMilestone] as never);

      const results = await service.getMilestones(projectId);
      expect(results).toHaveLength(1);
      expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId, status: { not: MilestoneStatus.ARCHIVED } }),
          orderBy: { dueDate: 'asc' },
        }),
      );
    });
  });

  describe('updateMilestone', () => {
    it('should update milestone title and dueDate', async () => {
      vi.mocked(mockPrisma.milestone.findFirst).mockResolvedValue(mockMilestone as never);
      vi.mocked(mockPrisma.milestone.update).mockResolvedValue({
        ...mockMilestone,
        title: 'Updated',
        dueDate: new Date('2026-05-01'),
      } as never);

      const result = await service.updateMilestone(milestoneId, employeeId, {
        title: 'Updated',
        dueDate: '2026-05-01',
      });
      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException if not found or not owned', async () => {
      vi.mocked(mockPrisma.milestone.findFirst).mockResolvedValue(null);

      await expect(
        service.updateMilestone(milestoneId, 'intruder', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeMilestone', () => {
    it('should set status to DONE and completedAt', async () => {
      vi.mocked(mockPrisma.milestone.findFirst).mockResolvedValue(mockMilestone as never);
      vi.mocked(mockPrisma.milestone.update).mockResolvedValue({
        ...mockMilestone,
        status: MilestoneStatus.DONE,
        completedAt: new Date(),
      } as never);

      const result = await service.completeMilestone(milestoneId, employeeId, {});
      expect(result.status).toBe(MilestoneStatus.DONE);
    });

    it('should throw ConflictException if already DONE', async () => {
      const done = { ...mockMilestone, status: MilestoneStatus.DONE };
      vi.mocked(mockPrisma.milestone.findFirst).mockResolvedValue(done as never);

      await expect(
        service.completeMilestone(milestoneId, employeeId, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if ARCHIVED', async () => {
      const archived = { ...mockMilestone, status: MilestoneStatus.ARCHIVED };
      vi.mocked(mockPrisma.milestone.findFirst).mockResolvedValue(archived as never);

      await expect(
        service.completeMilestone(milestoneId, employeeId, {}),
      ).rejects.toThrow(ConflictException);
    });
  });
});
