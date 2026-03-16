import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IStorageService, STORAGE_SERVICE } from '../storage/storage.interface';
import { buildS3Key } from '../storage/storage.utils';
import type { UploadDocumentDto } from './dto/upload-document.dto';
import type { ListDocumentsDto } from './dto/list-documents.dto';

// Allowed MIME types (validated upstream via file-type; this list is for audit)
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'application/zip',
  'text/plain',
]);

const MAX_SIZE_BYTES = 52_428_800; // 50 MB

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  // ── Upload ────────────────────────────────────────────────────────────────

  async upload(
    dto: UploadDocumentDto,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    sizeBytes: number,
    ownerId: string,
  ) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(`MIME type not allowed: ${mimeType}`);
    }
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(`File too large: max ${MAX_SIZE_BYTES} bytes`);
    }

    // Verify mission ownership
    const mission = await this.prisma.mission.findFirst({
      where: { id: dto.missionId, employeeId: ownerId },
    });
    if (!mission) {
      throw new NotFoundException('Mission not found or does not belong to you');
    }

    // Determine if this is a new version of an existing document
    const existingBase = await this.prisma.document.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        ownerId,
        missionId: dto.missionId,
      },
    });
    const existingVersions = existingBase
      ? await this.prisma.documentVersion.findMany({
          where: { documentId: existingBase.id },
          orderBy: { version: 'desc' },
          take: 1,
        })
      : null;

    const s3Key = buildS3Key(ownerId, dto.missionId, dto.projectId ?? null, originalName);
    await this.storage.uploadFile(buffer, s3Key, mimeType, sizeBytes);

    if (existingBase) {
      const nextVersion = (existingVersions?.[0]?.version ?? 0) + 1;
      const version = await this.prisma.documentVersion.create({
        data: {
          s3Key,
          sizeBytes,
          version: nextVersion,
          documentId: existingBase.id,
          uploadedById: ownerId,
        },
      });
      await this.prisma.document.update({
        where: { id: existingBase.id },
        data: { s3Key, mimeType, sizeBytes },
      });
      return { ...existingBase, currentVersion: version };
    }

    // First upload — create Document + DocumentVersion v1
    const document = await this.prisma.document.create({
      data: {
        name: dto.name,
        type: dto.type,
        s3Key,
        mimeType,
        sizeBytes,
        ownerId,
        missionId: dto.missionId,
        versions: {
          create: {
            s3Key,
            sizeBytes,
            version: 1,
            uploadedById: ownerId,
          },
        },
      },
      include: { versions: true },
    });

    return document;
  }

  // ── List ──────────────────────────────────────────────────────────────────

  async list(requesterId: string, filters: ListDocumentsDto) {
    return this.prisma.document.findMany({
      where: {
        ownerId: requesterId,
        ...(filters.missionId ? { missionId: filters.missionId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 1 },
        shares: { where: { revokedAt: null } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Get download URL ──────────────────────────────────────────────────────

  async getDownloadUrl(
    documentId: string,
    requesterId: string,
    requesterRole: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<string> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { shares: { where: { revokedAt: null } } },
    });

    if (!document) throw new NotFoundException('Document not found');

    const isOwner = document.ownerId === requesterId;
    const hasShare = document.shares.some((s) => s.sharedWithId === requesterId);

    if (!isOwner && !hasShare && requesterRole !== 'ESN_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    // Audit log every URL generation
    await this.prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_URL_GENERATED',
        resource: `document:${documentId}`,
        metadata: { key: document.s3Key },
        ipAddress: ip,
        userAgent,
        initiatorId: requesterId,
      },
    });

    return this.storage.getDownloadUrl(document.s3Key);
  }

  // ── Get detail ────────────────────────────────────────────────────────────

  async getDetail(documentId: string, requesterId: string, requesterRole: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: { orderBy: { version: 'asc' } },
        shares: true,
      },
    });

    if (!document) throw new NotFoundException('Document not found');

    const isOwner = document.ownerId === requesterId;
    const hasShare = document.shares.some((s) => s.sharedWithId === requesterId && !s.revokedAt);

    if (!isOwner && !hasShare && requesterRole !== 'ESN_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  async share(documentId: string, ownerId: string, targetUserId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (document.ownerId !== ownerId) throw new ForbiddenException('Only the owner can share');

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('Target user not found');

    // Upsert: if revoked, reactivate; if new, create
    const existing = await this.prisma.documentShare.findFirst({
      where: { documentId, sharedWithId: targetUserId },
    });

    if (existing) {
      if (!existing.revokedAt) {
        throw new BadRequestException('Already shared with this user');
      }
      return this.prisma.documentShare.update({
        where: { id: existing.id },
        data: { revokedAt: null },
      });
    }

    return this.prisma.documentShare.create({
      data: { documentId, sharedWithId: targetUserId },
    });
  }

  // ── Revoke share ──────────────────────────────────────────────────────────

  async revokeShare(documentId: string, shareId: string, ownerId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (document.ownerId !== ownerId) throw new ForbiddenException('Only the owner can revoke');

    const share = await this.prisma.documentShare.findFirst({
      where: { id: shareId, documentId },
    });
    if (!share) throw new NotFoundException('Share not found');
    if (share.revokedAt) throw new BadRequestException('Share already revoked');

    return this.prisma.documentShare.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  async getVersions(documentId: string, requesterId: string, requesterRole: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: { orderBy: { version: 'asc' } },
        shares: { where: { revokedAt: null } },
      },
    });

    if (!document) throw new NotFoundException('Document not found');

    const isOwner = document.ownerId === requesterId;
    const hasShare = document.shares.some((s) => s.sharedWithId === requesterId);

    if (!isOwner && !hasShare && requesterRole !== 'ESN_ADMIN') {
      throw new ForbiddenException('Access denied');
    }

    return document.versions;
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async softDelete(documentId: string, ownerId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found');
    if (document.ownerId !== ownerId) throw new ForbiddenException('Only the owner can delete');

    // Soft delete: revoke all shares, mark updated (no deletedAt on Document in schema)
    await this.prisma.documentShare.updateMany({
      where: { documentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return this.prisma.document.delete({ where: { id: documentId } });
  }
}
