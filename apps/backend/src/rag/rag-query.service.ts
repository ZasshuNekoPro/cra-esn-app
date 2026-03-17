import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@esn/shared-types';
import type { RagFilters, RagSource, ConversationTurn } from '@esn/shared-types';
import type { RagSourceType } from '@esn/rag-engine';
import { EmbedderService } from '@esn/rag-engine';
import { PrismaService } from '../database/prisma.service';
import type { RagQueryDto } from './dto/rag-query.dto';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const DEFAULT_TOP_K = 10;

export interface RetrievedChunk {
  content: string;
  sourceType: RagSourceType;
  sourceId: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/** Row shape returned by the pgvector $queryRaw */
interface RawChunkRow {
  content: string;
  source_type: string;
  source_id: string;
  metadata: unknown;
  similarity: number;
}

@Injectable()
export class RagQueryService {
  private readonly logger = new Logger(RagQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: EmbedderService,
    private readonly anthropic: Anthropic,
  ) {}

  // ── retrieve ──────────────────────────────────────────────────────────────

  async retrieve(
    employeeId: string,
    queryVector: number[],
    filters?: RagFilters,
    topK = DEFAULT_TOP_K,
  ): Promise<RetrievedChunk[]> {
    const vectorLiteral = `[${queryVector.join(',')}]`;

    // Build optional filter fragments
    const sourceTypeFilter =
      filters?.sourceType?.length
        ? Prisma.sql`AND source_type = ANY(${filters.sourceType}::text[])`
        : Prisma.empty;

    const projectIdFilter =
      filters?.projectId
        ? Prisma.sql`AND metadata->>'projectId' = ${filters.projectId}`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawChunkRow[]>`
      SELECT
        content,
        source_type,
        source_id,
        metadata,
        1 - (vector <=> ${vectorLiteral}::vector) AS similarity
      FROM embeddings
      WHERE employee_id = ${employeeId}::uuid
        ${sourceTypeFilter}
        ${projectIdFilter}
      ORDER BY vector <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;

    return rows.map((row) => ({
      content: row.content,
      sourceType: row.source_type as RagSourceType,
      sourceId: row.source_id,
      metadata: row.metadata as Record<string, unknown>,
      similarity: Number(row.similarity),
    }));
  }

  // ── buildSystemPrompt ─────────────────────────────────────────────────────

  buildSystemPrompt(chunks: RetrievedChunk[]): string {
    const base = `Tu es un assistant personnel pour un salarié d'ESN. \
Tu réponds en français, de façon concise et factuelle, en t'appuyant uniquement sur les données fournies. \
Si une information n'est pas dans le contexte, dis-le clairement. \
Ne divulgue pas les données d'autres salariés.`;

    if (chunks.length === 0) {
      return `${base}\n\nAucune donnée pertinente n'a été trouvée dans le contexte pour cette question.`;
    }

    const contextBlocks = chunks
      .map((c, i) => `[${i + 1}] (${c.sourceType}) ${c.content}`)
      .join('\n\n');

    return `${base}\n\n--- CONTEXTE ---\n${contextBlocks}\n--- FIN DU CONTEXTE ---`;
  }

  // ── formatSources ─────────────────────────────────────────────────────────

  formatSources(chunks: RetrievedChunk[]): RagSource[] {
    return chunks.map((c) => {
      const date = typeof c.metadata['date'] === 'string' ? c.metadata['date'] : undefined;
      const excerpt = c.content.length > 200 ? `${c.content.slice(0, 200)}...` : c.content;
      const source: RagSource = {
        sourceType: c.sourceType as RagSource['sourceType'],
        sourceId: c.sourceId,
        excerpt,
        ...(date !== undefined && { date }),
      };
      return source;
    });
  }

  // ── streamQuery ───────────────────────────────────────────────────────────

  async *streamQuery(
    employeeId: string,
    dto: RagQueryDto,
  ): AsyncGenerator<{ type: 'token'; content: string } | { type: 'sources'; sources: RagSource[] } | { type: 'done' }> {
    // 1. Embed the question
    const queryVector = await this.embedder.embedText(dto.question);

    // 2. Retrieve relevant chunks
    const chunks = await this.retrieve(employeeId, queryVector, dto.filters);

    // 3. Build prompt
    const systemPrompt = this.buildSystemPrompt(chunks);

    // 4. Build message history
    const history: ConversationTurn[] = dto.messages?.slice(-10) ?? [];
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content } as Anthropic.MessageParam)),
      { role: 'user', content: dto.question },
    ];

    // 5. Stream generation
    try {
      const stream = this.anthropic.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'token', content: event.delta.text };
        }
      }
    } catch (err) {
      this.logger.error('Anthropic streaming error', err);
      yield { type: 'token', content: '\n\n[Erreur lors de la génération de la réponse]' };
    }

    // 6. Emit sources after generation
    yield { type: 'sources', sources: this.formatSources(chunks) };
    yield { type: 'done' };

    // 7. Audit log (fire-and-forget)
    void this.prisma.auditLog.create({
      data: {
        action: AuditAction.RAG_QUERY,
        resource: `employee:${employeeId}`,
        metadata: { question: dto.question.slice(0, 200), chunksFound: chunks.length },
        initiatorId: employeeId,
      },
    });
  }
}
