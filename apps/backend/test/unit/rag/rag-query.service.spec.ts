import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagQueryService } from '../../../src/rag/rag-query.service';
import type { PrismaService } from '../../../src/database/prisma.service';

const employeeId = 'emp-uuid-1';

const mockEmbedder = {
  embedText: vi.fn().mockResolvedValue(Array(1536).fill(0.1)),
};

const mockAnthropic = {
  messages: {
    stream: vi.fn(),
  },
};

const mockPrisma = {
  $queryRaw: vi.fn(),
  auditLog: {
    create: vi.fn(),
  },
} satisfies Partial<PrismaService> as unknown as PrismaService;

const mockChunks = [
  {
    content: 'Travail en présentiel le 10/02/2026 (1 jour)',
    source_type: 'cra_entry',
    source_id: 'entry-uuid-1',
    metadata: { date: '2026-02-10', projectId: 'proj-1' },
    similarity: 0.92,
  },
  {
    content: 'Météo Ensoleillée le 10/02/2026',
    source_type: 'weather_entry',
    source_id: 'weather-uuid-1',
    metadata: { date: '2026-02-10', projectId: 'proj-1' },
    similarity: 0.78,
  },
];

describe('RagQueryService', () => {
  let service: RagQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RagQueryService(mockPrisma, mockEmbedder as never, mockAnthropic as never);
  });

  // ── retrieve ──────────────────────────────────────────────────────────────

  describe('retrieve', () => {
    it('should query pgvector and return top-K chunks for employee', async () => {
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue(mockChunks);

      const vector = Array(1536).fill(0.1);
      const result = await service.retrieve(employeeId, vector);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
      expect(result[0].sourceType).toBe('cra_entry');
      expect(result[0].similarity).toBe(0.92);
    });

    it('should return empty array when no similar chunks found', async () => {
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([]);

      const result = await service.retrieve(employeeId, Array(1536).fill(0));

      expect(result).toHaveLength(0);
    });

    it('should apply source type filter when provided', async () => {
      vi.mocked(mockPrisma.$queryRaw).mockResolvedValue([mockChunks[0]]);

      const result = await service.retrieve(employeeId, Array(1536).fill(0.1), {
        sourceType: ['cra_entry'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('cra_entry');
    });
  });

  // ── buildSystemPrompt ─────────────────────────────────────────────────────

  describe('buildSystemPrompt', () => {
    it('should include chunks content in the system prompt', () => {
      const chunks = [
        { content: 'Chunk 1', sourceType: 'cra_entry' as const, sourceId: 'id1', metadata: {}, similarity: 0.9 },
        { content: 'Chunk 2', sourceType: 'weather_entry' as const, sourceId: 'id2', metadata: {}, similarity: 0.8 },
      ];

      const prompt = service.buildSystemPrompt(chunks);

      expect(prompt).toContain('Chunk 1');
      expect(prompt).toContain('Chunk 2');
    });

    it('should return a default prompt when no chunks are found', () => {
      const prompt = service.buildSystemPrompt([]);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ── formatSources ─────────────────────────────────────────────────────────

  describe('formatSources', () => {
    it('should format retrieved chunks as RagSource array', () => {
      const chunks = [
        {
          content: 'Travail en présentiel le 10/02/2026',
          sourceType: 'cra_entry' as const,
          sourceId: 'entry-uuid-1',
          metadata: { date: '2026-02-10' },
          similarity: 0.92,
        },
      ];

      const sources = service.formatSources(chunks);

      expect(sources).toHaveLength(1);
      expect(sources[0].sourceType).toBe('cra_entry');
      expect(sources[0].sourceId).toBe('entry-uuid-1');
      expect(sources[0].excerpt).toBe('Travail en présentiel le 10/02/2026');
    });

    it('should truncate long excerpts to 200 chars', () => {
      const longContent = 'A'.repeat(300);
      const chunks = [
        { content: longContent, sourceType: 'document' as const, sourceId: 'doc-1', metadata: {}, similarity: 0.7 },
      ];

      const sources = service.formatSources(chunks);

      expect(sources[0].excerpt.length).toBeLessThanOrEqual(203); // 200 + '...'
    });
  });
});
