import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentVisibility, Role, AuditAction } from '@esn/shared-types';
import type { CreateCommentRequest, UpdateCommentRequest, RagIndexEvent } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const VISIBILITY_BY_ROLE: Record<Role, CommentVisibility[]> = {
  [Role.PLATFORM_ADMIN]: [CommentVisibility.ALL, CommentVisibility.EMPLOYEE_ESN, CommentVisibility.EMPLOYEE_CLIENT],
  [Role.EMPLOYEE]: [CommentVisibility.ALL, CommentVisibility.EMPLOYEE_ESN, CommentVisibility.EMPLOYEE_CLIENT],
  [Role.ESN_ADMIN]: [CommentVisibility.ALL, CommentVisibility.EMPLOYEE_ESN],
  [Role.CLIENT]: [CommentVisibility.ALL, CommentVisibility.EMPLOYEE_CLIENT],
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async createComment(
    projectId: string,
    callerId: string,
    callerRole: Role,
    dto: CreateCommentRequest,
  ) {
    const project = await this.prisma.project.findFirst({
      where: this.buildProjectAccessWhere(projectId, callerId, callerRole),
      select: { id: true },
    });

    if (!project) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce projet');
    }

    const comment = await this.prisma.projectComment.create({
      data: {
        content: dto.content,
        visibility: dto.visibility as never,
        isBlocker: dto.isBlocker ?? false,
        projectId,
        authorId: callerId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.COMMENT_CREATED,
        resource: `project:${projectId}`,
        metadata: { commentId: comment.id, visibility: dto.visibility },
        initiatorId: callerId,
      },
    });

    // Only index comments from employees (RAG corpus is per-employee)
    if (callerRole === Role.EMPLOYEE) {
      this.events.emit('rag.index.project_comment', {
        employeeId: callerId,
        sourceType: 'project_comment',
        sourceId: comment.id,
      } satisfies RagIndexEvent);
    }

    return comment;
  }

  async getComments(projectId: string, callerId: string, callerRole: Role) {
    const allowed = VISIBILITY_BY_ROLE[callerRole];

    const comments = await this.prisma.projectComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });

    return comments.filter(
      (c) => allowed.includes(c.visibility as unknown as CommentVisibility),
    );
  }

  async updateComment(commentId: string, callerId: string, dto: UpdateCommentRequest) {
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, authorId: callerId },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire introuvable ou accès non autorisé');
    }

    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility as never }),
      },
    });
  }

  async resolveBlocker(commentId: string, callerId: string) {
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, isBlocker: true },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire bloquant introuvable');
    }

    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: {
        resolvedAt: new Date(),
        resolvedById: callerId,
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildProjectAccessWhere(projectId: string, callerId: string, callerRole: Role) {
    switch (callerRole) {
      case Role.EMPLOYEE:
        return { id: projectId, mission: { employeeId: callerId } };
      case Role.ESN_ADMIN:
        return { id: projectId, mission: { esnAdminId: callerId } };
      case Role.CLIENT:
        return { id: projectId, mission: { clientId: callerId } };
    }
  }
}
