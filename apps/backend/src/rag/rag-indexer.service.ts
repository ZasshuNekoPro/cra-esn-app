import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  chunkCraEntry,
  chunkCraMonth,
  chunkProjectComment,
  chunkWeatherEntry,
  chunkMilestone,
  chunkDocumentAsync,
  EmbedderService,
} from '@esn/rag-engine';
import type { TextChunk } from '@esn/rag-engine';
import type { RagSourceType } from '@esn/shared-types';

@Injectable()
export class RagIndexerService {
  private readonly logger = new Logger(RagIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedder: EmbedderService,
  ) {}

  // ── Public indexing methods ─────────────────────────────────────────────────

  async indexCraEntry(sourceId: string, employeeId: string): Promise<void> {
    const entry = await this.prisma.craEntry.findUnique({
      where: { id: sourceId },
      include: { craMonth: { select: { employeeId: true } } },
    });

    if (!entry || entry.craMonth.employeeId !== employeeId) return;

    const dayFraction =
      typeof entry.dayFraction === 'object' && 'toNumber' in entry.dayFraction
        ? (entry.dayFraction as { toNumber: () => number }).toNumber()
        : Number(entry.dayFraction);

    const chunks = chunkCraEntry({
      id: entry.id,
      date: entry.date,
      entryType: entry.entryType,
      dayFraction,
      comment: entry.comment,
      employeeId,
    });

    await this._upsertChunks(chunks, employeeId, 'cra_entry', sourceId);
  }

  async indexCraMonth(sourceId: string, employeeId: string): Promise<void> {
    const month = await this.prisma.craMonth.findUnique({
      where: { id: sourceId },
      select: { id: true, year: true, month: true, employeeId: true },
    });

    if (!month || month.employeeId !== employeeId) return;

    // CraMonth has no activitySummary field in schema — use status description
    const chunks = chunkCraMonth({
      id: month.id,
      year: month.year,
      month: month.month,
      activitySummary: null, // populated when schema gains activitySummary field
      employeeId,
    });

    if (chunks.length === 0) return;
    await this._upsertChunks(chunks, employeeId, 'cra_month', sourceId);
  }

  async indexProjectComment(sourceId: string, employeeId: string): Promise<void> {
    const comment = await this.prisma.projectComment.findUnique({
      where: { id: sourceId },
      include: { project: { select: { id: true, mission: { select: { employeeId: true } } } } },
    });

    if (!comment || comment.project.mission.employeeId !== employeeId) return;

    // Skip ESN-only comments — they are not part of the employee's RAG corpus
    if (comment.visibility === 'EMPLOYEE_ESN') return;

    const chunks = chunkProjectComment({
      id: comment.id,
      content: comment.content,
      projectId: comment.project.id,
      date: comment.createdAt,
      employeeId,
    });

    await this._upsertChunks(chunks, employeeId, 'project_comment', sourceId);
  }

  async indexWeatherEntry(sourceId: string, employeeId: string): Promise<void> {
    const entry = await this.prisma.weatherEntry.findUnique({
      where: { id: sourceId },
      include: { project: { select: { id: true, mission: { select: { employeeId: true } } } } },
    });

    if (!entry || entry.project.mission.employeeId !== employeeId) return;

    const chunks = chunkWeatherEntry({
      id: entry.id,
      date: entry.date,
      state: entry.state,
      comment: entry.comment,
      projectId: entry.project.id,
      employeeId,
    });

    await this._upsertChunks(chunks, employeeId, 'weather_entry', sourceId);
  }

  async indexMilestone(sourceId: string, employeeId: string): Promise<void> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: sourceId },
      include: { project: { select: { id: true, mission: { select: { employeeId: true } } } } },
    });

    if (!milestone || milestone.project.mission.employeeId !== employeeId) return;

    const chunks = chunkMilestone({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      dueDate: milestone.dueDate,
      projectId: milestone.project.id,
      employeeId,
    });

    await this._upsertChunks(chunks, employeeId, 'milestone', sourceId);
  }

  async indexDocument(sourceId: string, employeeId: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: sourceId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!document || document.ownerId !== employeeId) return;

    // extractedText not yet in schema — skip until documents gain text extraction
    const chunks = await chunkDocumentAsync({
      id: document.id,
      name: document.name,
      extractedText: null,
      employeeId,
    });

    if (chunks.length === 0) return;
    await this._upsertChunks(chunks, employeeId, 'document', sourceId);
  }

  async deleteEmbeddings(
    employeeId: string,
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM embeddings
      WHERE employee_id = ${employeeId}::uuid
        AND source_type = ${sourceType}
        AND source_id   = ${sourceId}
    `;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async _upsertChunks(
    chunks: TextChunk[],
    employeeId: string,
    sourceType: RagSourceType,
    sourceId: string,
  ): Promise<void> {
    if (chunks.length === 0) return;

    // Delete existing embeddings for this source before reinserting
    await this.deleteEmbeddings(employeeId, sourceType, sourceId);

    for (const chunk of chunks) {
      try {
        const vector = await this.embedder.embedText(chunk.content);
        const vectorLiteral = `[${vector.join(',')}]`;
        const metadata = chunk.metadata as unknown as Prisma.InputJsonValue;

        await this.prisma.$executeRaw`
          INSERT INTO embeddings (id, content, vector, metadata, source_type, source_id, employee_id, created_at)
          VALUES (
            gen_random_uuid(),
            ${chunk.content},
            ${vectorLiteral}::vector,
            ${metadata}::jsonb,
            ${sourceType},
            ${sourceId},
            ${employeeId}::uuid,
            NOW()
          )
        `;
      } catch (err) {
        this.logger.error(
          `Failed to index chunk for ${sourceType}:${sourceId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }
}
