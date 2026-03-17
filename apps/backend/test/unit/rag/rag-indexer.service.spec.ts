import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagIndexerService } from '../../../src/rag/rag-indexer.service';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'emp-uuid-1';
const sourceId = 'source-uuid-1';

// Minimal mock: embed returns fixed vector, prisma handles DB ops
const mockEmbedder = {
  embedText: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
};

const mockPrisma = {
  craEntry: {
    findUnique: vi.fn(),
  },
  craMonth: {
    findUnique: vi.fn(),
  },
  projectComment: {
    findUnique: vi.fn(),
  },
  weatherEntry: {
    findUnique: vi.fn(),
  },
  milestone: {
    findUnique: vi.fn(),
  },
  document: {
    findUnique: vi.fn(),
  },
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn(),
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('RagIndexerService', () => {
  let service: RagIndexerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RagIndexerService(mockPrisma, mockEmbedder as never);
  });

  // ── indexCraEntry ──────────────────────────────────────────────────────────

  describe('indexCraEntry', () => {
    it('should fetch the entry, embed its content and upsert in DB', async () => {
      vi.mocked(mockPrisma.craEntry.findUnique).mockResolvedValue({
        id: sourceId,
        date: new Date('2026-02-10'),
        entryType: 'WORK_ONSITE',
        dayFraction: { toNumber: () => 1 },
        comment: 'Réunion sprint',
        craMonth: { employeeId },
      } as never);

      await service.indexCraEntry(sourceId, employeeId);

      expect(mockEmbedder.embedText).toHaveBeenCalledOnce();
      // 2 calls: 1 DELETE (upsert strategy) + 1 INSERT
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should skip indexing if entry not found', async () => {
      vi.mocked(mockPrisma.craEntry.findUnique).mockResolvedValue(null);

      await service.indexCraEntry('missing-id', employeeId);

      expect(mockEmbedder.embedText).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('should embed only the employee-owned entry (not cross-employee)', async () => {
      vi.mocked(mockPrisma.craEntry.findUnique).mockResolvedValue({
        id: sourceId,
        date: new Date('2026-02-10'),
        entryType: 'WORK_ONSITE',
        dayFraction: { toNumber: () => 1 },
        comment: null,
        craMonth: { employeeId: 'other-employee-id' }, // different employee
      } as never);

      await service.indexCraEntry(sourceId, employeeId);

      // Should not index because employeeId doesn't match
      expect(mockEmbedder.embedText).not.toHaveBeenCalled();
    });
  });

  // ── indexProjectComment ────────────────────────────────────────────────────

  describe('indexProjectComment', () => {
    it('should skip comments with ESN-only or CLIENT-only visibility', async () => {
      vi.mocked(mockPrisma.projectComment.findUnique).mockResolvedValue({
        id: sourceId,
        content: 'Note interne ESN',
        visibility: 'EMPLOYEE_ESN',
        project: { mission: { employeeId } },
      } as never);

      await service.indexProjectComment(sourceId, employeeId);

      // ESN-only comments should not be indexed in the employee RAG
      expect(mockEmbedder.embedText).not.toHaveBeenCalled();
    });

    it('should index comments visible to the employee (EMPLOYEE_CLIENT, ALL)', async () => {
      for (const visibility of ['EMPLOYEE_CLIENT', 'ALL']) {
        vi.clearAllMocks();
        vi.mocked(mockPrisma.projectComment.findUnique).mockResolvedValue({
          id: sourceId,
          content: 'Retour du client',
          visibility,
          createdAt: new Date(),
          project: { id: 'proj-1', mission: { employeeId } },
        } as never);

        await service.indexProjectComment(sourceId, employeeId);

        expect(mockEmbedder.embedText).toHaveBeenCalledOnce();
      }
    });
  });

  // ── indexMilestone ─────────────────────────────────────────────────────────

  describe('indexMilestone', () => {
    it('should index a milestone with its title, status and dueDate', async () => {
      vi.mocked(mockPrisma.milestone.findUnique).mockResolvedValue({
        id: sourceId,
        title: 'Livraison V2',
        description: 'Go live',
        status: 'LATE',
        dueDate: new Date('2026-02-01'),
        createdAt: new Date(),
        project: { id: 'proj-1', mission: { employeeId } },
      } as never);

      await service.indexMilestone(sourceId, employeeId);

      expect(mockEmbedder.embedText).toHaveBeenCalledOnce();
      // 2 calls: 1 DELETE (upsert strategy) + 1 INSERT
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should skip milestone not belonging to employee', async () => {
      vi.mocked(mockPrisma.milestone.findUnique).mockResolvedValue({
        id: sourceId,
        title: 'Jalon',
        description: null,
        status: 'PLANNED',
        dueDate: null,
        project: { id: 'proj-1', mission: { employeeId: 'other-emp' } },
      } as never);

      await service.indexMilestone(sourceId, employeeId);

      expect(mockEmbedder.embedText).not.toHaveBeenCalled();
    });
  });

  // ── deleteEmbeddings ───────────────────────────────────────────────────────

  describe('deleteEmbeddings', () => {
    it('should call $executeRaw to delete embeddings for a source', async () => {
      await service.deleteEmbeddings(employeeId, 'cra_entry', sourceId);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledOnce();
    });
  });
});
