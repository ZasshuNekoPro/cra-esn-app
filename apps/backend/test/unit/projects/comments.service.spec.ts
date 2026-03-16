import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from '../../../src/projects/comments.service';
import { CommentVisibility, Role, AuditAction } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'employee-uuid-1';
const esnAdminId = 'esnadmin-uuid-1';
const clientId = 'client-uuid-1';
const projectId = 'project-uuid-1';
const commentId = 'comment-uuid-1';

const mockComment = {
  id: commentId,
  content: 'Bonne avancée sur le sprint',
  visibility: CommentVisibility.ALL,
  isBlocker: false,
  resolvedAt: null,
  resolvedById: null,
  projectId,
  authorId: employeeId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProject = {
  id: projectId,
  mission: { employeeId, esnAdminId, clientId },
};

const mockPrisma = {
  projectComment: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  project: {
    findFirst: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CommentsService(mockPrisma);
  });

  describe('createComment', () => {
    it('should create a comment on an accessible project', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);
      vi.mocked(mockPrisma.projectComment.create).mockResolvedValue(mockComment as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      const result = await service.createComment(projectId, employeeId, Role.EMPLOYEE, {
        content: 'Bonne avancée sur le sprint',
        visibility: CommentVisibility.ALL,
      });

      expect(result.content).toBe('Bonne avancée sur le sprint');
      expect(mockPrisma.projectComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorId: employeeId, projectId }),
        }),
      );
    });

    it('should throw ForbiddenException if caller has no access to project', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(null);

      await expect(
        service.createComment(projectId, 'intruder', Role.EMPLOYEE, {
          content: 'X',
          visibility: CommentVisibility.ALL,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create audit log entry on comment creation', async () => {
      vi.mocked(mockPrisma.project.findFirst).mockResolvedValue(mockProject as never);
      vi.mocked(mockPrisma.projectComment.create).mockResolvedValue(mockComment as never);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);

      await service.createComment(projectId, employeeId, Role.EMPLOYEE, {
        content: 'Test',
        visibility: CommentVisibility.EMPLOYEE_ESN,
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.COMMENT_CREATED }),
        }),
      );
    });
  });

  describe('getComments', () => {
    it('should return ALL and EMPLOYEE_ESN comments for EMPLOYEE role', async () => {
      const comments = [
        { ...mockComment, visibility: CommentVisibility.ALL },
        { ...mockComment, id: 'c2', visibility: CommentVisibility.EMPLOYEE_ESN },
        { ...mockComment, id: 'c3', visibility: CommentVisibility.EMPLOYEE_CLIENT },
      ];
      vi.mocked(mockPrisma.projectComment.findMany).mockResolvedValue(comments as never);

      const results = await service.getComments(projectId, employeeId, Role.EMPLOYEE);
      expect(results).toHaveLength(3);
    });

    it('should filter EMPLOYEE_CLIENT comments from ESN_ADMIN view', async () => {
      const comments = [
        { ...mockComment, visibility: CommentVisibility.ALL },
        { ...mockComment, id: 'c2', visibility: CommentVisibility.EMPLOYEE_ESN },
        { ...mockComment, id: 'c3', visibility: CommentVisibility.EMPLOYEE_CLIENT },
      ];
      vi.mocked(mockPrisma.projectComment.findMany).mockResolvedValue(comments as never);

      const results = await service.getComments(projectId, esnAdminId, Role.ESN_ADMIN);
      // ESN sees ALL and EMPLOYEE_ESN but not EMPLOYEE_CLIENT
      const visibilities = results.map((c) => c.visibility);
      expect(visibilities).not.toContain(CommentVisibility.EMPLOYEE_CLIENT);
    });

    it('should filter EMPLOYEE_ESN comments from CLIENT view', async () => {
      const comments = [
        { ...mockComment, visibility: CommentVisibility.ALL },
        { ...mockComment, id: 'c2', visibility: CommentVisibility.EMPLOYEE_ESN },
        { ...mockComment, id: 'c3', visibility: CommentVisibility.EMPLOYEE_CLIENT },
      ];
      vi.mocked(mockPrisma.projectComment.findMany).mockResolvedValue(comments as never);

      const results = await service.getComments(projectId, clientId, Role.CLIENT);
      // CLIENT sees ALL and EMPLOYEE_CLIENT but not EMPLOYEE_ESN
      const visibilities = results.map((c) => c.visibility);
      expect(visibilities).not.toContain(CommentVisibility.EMPLOYEE_ESN);
    });
  });

  describe('updateComment', () => {
    it('should update own comment content', async () => {
      vi.mocked(mockPrisma.projectComment.findFirst).mockResolvedValue(mockComment as never);
      vi.mocked(mockPrisma.projectComment.update).mockResolvedValue({
        ...mockComment,
        content: 'Updated content',
      } as never);

      const result = await service.updateComment(commentId, employeeId, { content: 'Updated content' });
      expect(result.content).toBe('Updated content');
    });

    it('should throw NotFoundException if comment not found or not owned', async () => {
      vi.mocked(mockPrisma.projectComment.findFirst).mockResolvedValue(null);

      await expect(
        service.updateComment(commentId, 'other-user', { content: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveBlocker', () => {
    const blockerComment = { ...mockComment, isBlocker: true };

    it('should mark a blocker as resolved', async () => {
      vi.mocked(mockPrisma.projectComment.findFirst).mockResolvedValue(blockerComment as never);
      vi.mocked(mockPrisma.projectComment.update).mockResolvedValue({
        ...blockerComment,
        resolvedAt: new Date(),
        resolvedById: esnAdminId,
      } as never);

      const result = await service.resolveBlocker(commentId, esnAdminId);
      expect(result.resolvedAt).toBeDefined();
      expect(result.resolvedById).toBe(esnAdminId);
    });

    it('should throw NotFoundException if comment not found', async () => {
      vi.mocked(mockPrisma.projectComment.findFirst).mockResolvedValue(null);

      await expect(service.resolveBlocker('nonexistent', esnAdminId)).rejects.toThrow(NotFoundException);
    });
  });
});
