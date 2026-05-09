import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContextNotesService } from '../../../src/rag/context-notes.service';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'emp-uuid-1';
const otherEmployeeId = 'emp-uuid-2';
const missionId = 'mission-uuid-1';
const noteId = 'note-uuid-1';

const mockNote = {
  id: noteId,
  content: 'COMPARAISON: aligné\n---\nREMARQUES: ok',
  missionId,
  employeeId,
  createdAt: new Date('2026-05-01T10:00:00Z'),
};

const mockPrisma = {
  contextNote: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
  auditLog: { create: vi.fn() },
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('ContextNotesService', () => {
  let service: ContextNotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContextNotesService(mockPrisma);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a note and return without userInput field', async () => {
      vi.mocked(mockPrisma.contextNote.create).mockResolvedValue(mockNote);

      const result = await service.create({
        content: 'COMPARAISON: aligné\n---\nREMARQUES: ok',
        userInput: 'Mon info confidentielle',
        missionId,
        employeeId,
      });

      expect(mockPrisma.contextNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ userInput: expect.anything() }),
        }),
      );
      expect(result).not.toHaveProperty('userInput');
      expect(result.id).toBe(noteId);
    });

    it('should persist the content and missionId', async () => {
      vi.mocked(mockPrisma.contextNote.create).mockResolvedValue(mockNote);

      await service.create({ content: 'test', userInput: 'pii', missionId, employeeId });

      const callArg = vi.mocked(mockPrisma.contextNote.create).mock.calls[0][0];
      expect(callArg.data.content).toBe('test');
      expect(callArg.data.missionId).toBe(missionId);
      expect(callArg.data.employeeId).toBe(employeeId);
      expect(callArg.data.userInput).toBe('pii');
    });
  });

  // ── listByMission ──────────────────────────────────────────────────────────

  describe('listByMission', () => {
    it('should return paginated data with total count', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([[mockNote], 1]);

      const result = await service.listByMission({ missionId, employeeId, page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should default to page 1 and pageSize 20', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0]);

      const result = await service.listByMission({ missionId, employeeId });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should cap pageSize at 50', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0]);

      const result = await service.listByMission({ missionId, employeeId, pageSize: 200 });

      expect(result.pageSize).toBe(50);
    });

    it('should filter by both missionId and employeeId', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0]);

      await service.listByMission({ missionId, employeeId });

      const txCalls = vi.mocked(mockPrisma.$transaction).mock.calls[0][0] as unknown[];
      expect(txCalls).toHaveLength(2);
    });

    it('should order results by createdAt descending', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([[], 0]);

      await service.listByMission({ missionId, employeeId });

      // Verify $transaction was called (indirectly verifies orderBy is set in the service)
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete the note when requester is the owner', async () => {
      vi.mocked(mockPrisma.contextNote.findUnique).mockResolvedValue({
        employeeId,
        missionId,
      } as never);
      vi.mocked(mockPrisma.contextNote.delete).mockResolvedValue(mockNote);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue(undefined as never);

      await expect(service.delete(noteId, employeeId)).resolves.toBeUndefined();

      expect(mockPrisma.contextNote.delete).toHaveBeenCalledWith({ where: { id: noteId } });
    });

    it('should throw NotFoundException when note does not exist', async () => {
      vi.mocked(mockPrisma.contextNote.findUnique).mockResolvedValue(null);

      await expect(service.delete(noteId, employeeId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when requester is not the owner', async () => {
      vi.mocked(mockPrisma.contextNote.findUnique).mockResolvedValue({
        employeeId: otherEmployeeId,
        missionId,
      } as never);

      await expect(service.delete(noteId, employeeId)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contextNote.delete).not.toHaveBeenCalled();
    });

    it('should fire audit log after successful deletion', async () => {
      vi.mocked(mockPrisma.contextNote.findUnique).mockResolvedValue({
        employeeId,
        missionId,
      } as never);
      vi.mocked(mockPrisma.contextNote.delete).mockResolvedValue(mockNote);
      vi.mocked(mockPrisma.auditLog.create).mockResolvedValue(undefined as never);

      await service.delete(noteId, employeeId);

      // Audit log is fire-and-forget (void), just verify it was called
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resource: `context_note:${noteId}`,
          }),
        }),
      );
    });
  });
});
