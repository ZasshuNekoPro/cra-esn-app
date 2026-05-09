import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditAction } from '@esn/shared-types';
import { PrismaService } from '../database/prisma.service';

export interface ContextNoteCreateInput {
  content: string;
  userInput: string;
  missionId: string;
  employeeId: string;
}

export interface ContextNoteListOptions {
  missionId: string;
  employeeId: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ContextNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: ContextNoteCreateInput) {
    return this.prisma.contextNote.create({
      data: {
        content: input.content,
        userInput: input.userInput,
        missionId: input.missionId,
        employeeId: input.employeeId,
      },
      select: {
        id: true,
        content: true,
        missionId: true,
        employeeId: true,
        createdAt: true,
        // userInput intentionally excluded from select — PII
      },
    });
  }

  async listByMission(opts: ContextNoteListOptions) {
    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 20, 50);
    const skip = (page - 1) * pageSize;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contextNote.findMany({
        where: { missionId: opts.missionId, employeeId: opts.employeeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          content: true,
          missionId: true,
          employeeId: true,
          createdAt: true,
        },
      }),
      this.prisma.contextNote.count({
        where: { missionId: opts.missionId, employeeId: opts.employeeId },
      }),
    ]);

    return { data, total, page, pageSize };
  }

  async delete(noteId: string, requesterId: string) {
    const note = await this.prisma.contextNote.findUnique({
      where: { id: noteId },
      select: { employeeId: true, missionId: true },
    });

    if (!note) throw new NotFoundException('Note introuvable');
    if (note.employeeId !== requesterId) throw new ForbiddenException('Accès refusé');

    await this.prisma.contextNote.delete({ where: { id: noteId } });

    void this.prisma.auditLog.create({
      data: {
        action: AuditAction.CONTEXT_NOTE_DELETED,
        resource: `context_note:${noteId}`,
        metadata: { missionId: note.missionId },
        initiatorId: requesterId,
      },
    });
  }
}
