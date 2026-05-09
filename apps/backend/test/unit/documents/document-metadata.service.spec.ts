import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentMetadataService } from '../../../src/documents/document-metadata.service';
import type { PrismaService } from '../../../src/database/prisma.service';

const ownerId = 'owner-uuid-1';
const otherId = 'other-uuid-2';
const documentId = 'doc-uuid-1';

const mockMetadata = {
  id: 'meta-uuid-1',
  documentId,
  version: '1.0',
  isObsolete: false,
  documentDate: null,
  serviceInvolved: null,
  tags: [],
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-01'),
};

const mockPrisma = {
  document: { findUnique: vi.fn() },
  documentMetadata: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  embedding: { deleteMany: vi.fn() },
} satisfies Partial<PrismaService> as unknown as PrismaService;

describe('DocumentMetadataService', () => {
  let service: DocumentMetadataService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentMetadataService(mockPrisma);
  });

  // ── findByDocument ────────────────────────────────────────────────────────

  describe('findByDocument', () => {
    it('should return metadata when requester owns the document', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({ ownerId } as never);
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue(mockMetadata);

      const result = await service.findByDocument(documentId, ownerId);

      expect(result).toEqual(mockMetadata);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(null);

      await expect(service.findByDocument(documentId, ownerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when requester is not the owner', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({ ownerId } as never);

      await expect(service.findByDocument(documentId, otherId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when metadata does not exist for document', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({ ownerId } as never);
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue(null);

      await expect(service.findByDocument(documentId, ownerId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── upsert ────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    beforeEach(() => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({ ownerId } as never);
    });

    it('should upsert metadata and return result', async () => {
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.documentMetadata.upsert).mockResolvedValue(mockMetadata);

      const result = await service.upsert(documentId, ownerId, { version: '2.0' });

      expect(mockPrisma.documentMetadata.upsert).toHaveBeenCalledOnce();
      expect(result).toEqual(mockMetadata);
    });

    it('should delete embeddings when document transitions to isObsolete=true', async () => {
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue({
        isObsolete: false,
      } as never);
      vi.mocked(mockPrisma.documentMetadata.upsert).mockResolvedValue({
        ...mockMetadata,
        isObsolete: true,
      });
      vi.mocked(mockPrisma.embedding.deleteMany).mockResolvedValue({ count: 5 });

      await service.upsert(documentId, ownerId, { isObsolete: true });

      expect(mockPrisma.embedding.deleteMany).toHaveBeenCalledWith({
        where: { documentId },
      });
    });

    it('should NOT delete embeddings when isObsolete was already true', async () => {
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue({
        isObsolete: true,
      } as never);
      vi.mocked(mockPrisma.documentMetadata.upsert).mockResolvedValue({
        ...mockMetadata,
        isObsolete: true,
      });

      await service.upsert(documentId, ownerId, { isObsolete: true });

      expect(mockPrisma.embedding.deleteMany).not.toHaveBeenCalled();
    });

    it('should NOT delete embeddings when document stays active (isObsolete=false)', async () => {
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.documentMetadata.upsert).mockResolvedValue(mockMetadata);

      await service.upsert(documentId, ownerId, { tags: ['contrat'] });

      expect(mockPrisma.embedding.deleteMany).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when requester does not own the document', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({ ownerId } as never);

      await expect(service.upsert(documentId, otherId, {})).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.documentMetadata.upsert).not.toHaveBeenCalled();
    });

    it('should use default version "1.0" on create when not provided', async () => {
      vi.mocked(mockPrisma.documentMetadata.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.documentMetadata.upsert).mockResolvedValue(mockMetadata);

      await service.upsert(documentId, ownerId, {});

      const upsertCall = vi.mocked(mockPrisma.documentMetadata.upsert).mock.calls[0][0];
      expect(upsertCall.create.version).toBe('1.0');
    });
  });
});
