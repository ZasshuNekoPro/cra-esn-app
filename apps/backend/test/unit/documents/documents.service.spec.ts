import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DocumentsService } from '../../../src/documents/documents.service';
import { DocumentType } from '@esn/shared-types';
import type { PrismaService } from '../../../src/database/prisma.service';
import type { IStorageService } from '../../../src/storage/storage.interface';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ownerId = 'owner-uuid-1';
const otherUserId = 'other-uuid-2';
const missionId = 'mission-uuid-1';
const documentId = 'doc-uuid-1';
const shareId = 'share-uuid-1';

const mockMission = { id: missionId, employeeId: ownerId };

const mockDocument = {
  id: documentId,
  name: 'Rapport Q1',
  type: DocumentType.OTHER,
  s3Key: `${ownerId}/${missionId}/mission/uuid-rapport-q1.pdf`,
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  ownerId,
  missionId,
  createdAt: new Date(),
  updatedAt: new Date(),
  shares: [],
  versions: [{ id: 'v1', version: 1, s3Key: 'key', sizeBytes: 1024, createdAt: new Date() }],
};

const mockShare = {
  id: shareId,
  documentId,
  sharedWithId: otherUserId,
  revokedAt: null,
  createdAt: new Date(),
};

// ── Mock Prisma ───────────────────────────────────────────────────────────────

const mockPrisma = {
  mission: { findFirst: vi.fn() },
  document: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  documentVersion: { create: vi.fn(), findMany: vi.fn() },
  documentShare: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  user: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
} as unknown as PrismaService;

// ── Mock Storage ──────────────────────────────────────────────────────────────

const mockStorage = {
  uploadFile: vi.fn().mockResolvedValue('key'),
  getDownloadUrl: vi.fn().mockResolvedValue('https://presigned.example.com/file'),
  deleteObject: vi.fn().mockResolvedValue(undefined),
} as unknown as IStorageService;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentsService(mockPrisma, mockStorage);
    vi.mocked(mockPrisma.auditLog.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.user.findUnique).mockResolvedValue({ id: otherUserId } as never);
  });

  // ── upload ──────────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('should create Document + DocumentVersion v1 on first upload', async () => {
      vi.mocked(mockPrisma.mission.findFirst).mockResolvedValue(mockMission as never);
      vi.mocked(mockPrisma.document.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.document.create).mockResolvedValue(mockDocument as never);

      const result = await service.upload(
        { name: 'Rapport Q1', type: DocumentType.OTHER, missionId },
        Buffer.from('pdf-content'),
        'rapport_q1.pdf',
        'application/pdf',
        1024,
        ownerId,
      );

      expect(mockStorage.uploadFile).toHaveBeenCalledOnce();
      expect(mockPrisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Rapport Q1', ownerId }),
        }),
      );
      expect(result).toMatchObject({ id: documentId });
    });

    it('should create DocumentVersion v2 when same name already exists', async () => {
      vi.mocked(mockPrisma.mission.findFirst).mockResolvedValue(mockMission as never);
      vi.mocked(mockPrisma.document.findFirst).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentVersion.findMany).mockResolvedValue([
        { id: 'v1', version: 1, s3Key: 'old-key', sizeBytes: 1024, createdAt: new Date() },
      ] as never);
      vi.mocked(mockPrisma.documentVersion.create).mockResolvedValue({
        id: 'v2',
        version: 2,
        s3Key: 'new-key',
        sizeBytes: 2048,
        createdAt: new Date(),
      } as never);
      vi.mocked(mockPrisma.document.update).mockResolvedValue(mockDocument as never);

      await service.upload(
        { name: 'Rapport Q1', type: DocumentType.OTHER, missionId },
        Buffer.from('updated-content'),
        'rapport_q1_v2.pdf',
        'application/pdf',
        2048,
        ownerId,
      );

      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 2, documentId }),
        }),
      );
    });

    it('should reject disallowed MIME types', async () => {
      await expect(
        service.upload(
          { name: 'Malware', type: DocumentType.OTHER, missionId },
          Buffer.from('data'),
          'evil.exe',
          'application/x-msdownload',
          100,
          ownerId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding 50 MB', async () => {
      await expect(
        service.upload(
          { name: 'Big file', type: DocumentType.OTHER, missionId },
          Buffer.alloc(60_000_000),
          'huge.pdf',
          'application/pdf',
          60_000_000,
          ownerId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when mission does not belong to owner', async () => {
      vi.mocked(mockPrisma.mission.findFirst).mockResolvedValue(null);

      await expect(
        service.upload(
          { name: 'Doc', type: DocumentType.OTHER, missionId },
          Buffer.from('x'),
          'doc.pdf',
          'application/pdf',
          1,
          ownerId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getDownloadUrl ──────────────────────────────────────────────────────────

  describe('getDownloadUrl', () => {
    it('should return a presigned URL for the document owner', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);

      const url = await service.getDownloadUrl(documentId, ownerId, 'EMPLOYEE', null, null);

      expect(url).toBe('https://presigned.example.com/file');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'DOCUMENT_URL_GENERATED' }),
        }),
      );
    });

    it('should return URL for a user with an active share', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({
        ...mockDocument,
        shares: [mockShare],
      } as never);

      const url = await service.getDownloadUrl(documentId, otherUserId, 'EMPLOYEE', null, null);
      expect(url).toBe('https://presigned.example.com/file');
    });

    it('should block download for users without a share', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue({
        ...mockDocument,
        shares: [],
      } as never);

      await expect(
        service.getDownloadUrl(documentId, 'random-user', 'EMPLOYEE', null, null),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── share ───────────────────────────────────────────────────────────────────

  describe('share', () => {
    it('should create a DocumentShare', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentShare.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.documentShare.create).mockResolvedValue(mockShare as never);

      const result = await service.share(documentId, ownerId, otherUserId);
      expect(result).toMatchObject({ documentId });
    });

    it('should throw ForbiddenException if requester is not the owner', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);

      await expect(service.share(documentId, otherUserId, ownerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reactivate a previously revoked share', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentShare.findFirst).mockResolvedValue({
        ...mockShare,
        revokedAt: new Date(),
      } as never);
      vi.mocked(mockPrisma.documentShare.update).mockResolvedValue(mockShare as never);

      await service.share(documentId, ownerId, otherUserId);
      expect(mockPrisma.documentShare.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: null } }),
      );
    });

    it('should throw if already shared', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentShare.findFirst).mockResolvedValue(mockShare as never);

      await expect(service.share(documentId, ownerId, otherUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── revokeShare ─────────────────────────────────────────────────────────────

  describe('revokeShare', () => {
    it('should set revokedAt on the share', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentShare.findFirst).mockResolvedValue(mockShare as never);
      vi.mocked(mockPrisma.documentShare.update).mockResolvedValue({
        ...mockShare,
        revokedAt: new Date(),
      } as never);

      const result = await service.revokeShare(documentId, shareId, ownerId);
      expect(result.revokedAt).toBeInstanceOf(Date);
    });

    it('should throw if share already revoked', async () => {
      vi.mocked(mockPrisma.document.findUnique).mockResolvedValue(mockDocument as never);
      vi.mocked(mockPrisma.documentShare.findFirst).mockResolvedValue({
        ...mockShare,
        revokedAt: new Date(),
      } as never);

      await expect(service.revokeShare(documentId, shareId, ownerId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
