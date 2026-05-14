import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { UpsertDocumentMetadataDto } from './dto/upsert-document-metadata.dto';

@Injectable()
export class DocumentMetadataService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDocument(documentId: string, requesterId: string) {
    await this.assertOwnership(documentId, requesterId);
    const metadata = await this.prisma.documentMetadata.findUnique({
      where: { documentId },
    });
    if (!metadata) throw new NotFoundException('Aucune métadonnée pour ce document');
    return metadata;
  }

  async upsert(documentId: string, requesterId: string, dto: UpsertDocumentMetadataDto) {
    await this.assertOwnership(documentId, requesterId);

    const wasObsolete = await this.getCurrentObsoleteState(documentId);

    const metadata = await this.prisma.documentMetadata.upsert({
      where: { documentId },
      create: {
        documentId,
        version: dto.version ?? '1.0',
        isObsolete: dto.isObsolete ?? false,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
        serviceInvolved: dto.serviceInvolved ?? null,
        tags: dto.tags ?? [],
        author: dto.author ?? null,
        summary: dto.summary ?? null,
        language: dto.language ?? null,
        confidentialityLevel: dto.confidentialityLevel ?? null,
        applicableFromDate: dto.applicableFromDate ? new Date(dto.applicableFromDate) : null,
        applicableUntilDate: dto.applicableUntilDate ? new Date(dto.applicableUntilDate) : null,
      },
      update: {
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.isObsolete !== undefined && { isObsolete: dto.isObsolete }),
        ...(dto.documentDate !== undefined && {
          documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
        }),
        ...(dto.serviceInvolved !== undefined && { serviceInvolved: dto.serviceInvolved }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.author !== undefined && { author: dto.author }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.confidentialityLevel !== undefined && { confidentialityLevel: dto.confidentialityLevel }),
        ...(dto.applicableFromDate !== undefined && {
          applicableFromDate: dto.applicableFromDate ? new Date(dto.applicableFromDate) : null,
        }),
        ...(dto.applicableUntilDate !== undefined && {
          applicableUntilDate: dto.applicableUntilDate ? new Date(dto.applicableUntilDate) : null,
        }),
      },
    });

    const becomingObsolete = dto.isObsolete === true && !wasObsolete;
    const becomingActive = dto.isObsolete === false && wasObsolete;

    if (becomingObsolete) {
      await this.prisma.embedding.deleteMany({
        where: { documentId },
      });
    }

    if (becomingActive) {
      // Embeddings will be re-indexed by the RagIndexerService on next document access.
      // Emit re-index event via Prisma audit log trigger is handled by caller if needed.
      // For now: embeddings are cleared on obsolete; re-index on reactivation is deferred to Phase 2.
    }

    return metadata;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assertOwnership(documentId: string, requesterId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    if (doc.ownerId !== requesterId) throw new ForbiddenException('Accès refusé');
  }

  private async getCurrentObsoleteState(documentId: string): Promise<boolean> {
    const existing = await this.prisma.documentMetadata.findUnique({
      where: { documentId },
      select: { isObsolete: true },
    });
    return existing?.isObsolete ?? false;
  }
}
