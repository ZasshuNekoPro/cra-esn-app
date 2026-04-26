import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { S3StorageService } from '../../../src/storage/drivers/s3.storage';

// ── Mock AWS SDK ──────────────────────────────────────────────────────────────

const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation((args) => ({ ...args, _type: 'PutObject' })),
  DeleteObjectCommand: vi.fn().mockImplementation((args) => ({ ...args, _type: 'DeleteObject' })),
  GetObjectCommand: vi.fn().mockImplementation((args) => ({ ...args, _type: 'GetObject' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/bucket/test-key?X-Amz-Signature=abc'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'eu-west-3',
    S3_ACCESS_KEY: 'minioadmin',
    S3_SECRET_KEY: 'minioadmin',
    S3_BUCKET: 'test-bucket',
    ...overrides,
  };
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key in values) return values[key];
      throw new Error(`Missing config: ${key}`);
    }),
    get: vi.fn((key: string, def?: string) => values[key] ?? def),
  } as unknown as ConfigService;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('S3StorageService', () => {
  let service: S3StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    service = new S3StorageService(makeConfig());
  });

  it('should upload a buffer and return the key', async () => {
    const buffer = Buffer.from('hello');
    const key = await service.uploadFile(buffer, 'owner/mission/file.pdf', 'application/pdf', 5);

    expect(mockSend).toHaveBeenCalledOnce();
    expect(key).toBe('owner/mission/file.pdf');
  });

  it('should return a presigned download URL', async () => {
    const url = await service.getDownloadUrl('owner/mission/file.pdf');

    expect(url).toContain('X-Amz-Signature');
    expect(url).toContain('test-key');
  });

  it('should use custom expiry when provided', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    await service.getDownloadUrl('owner/mission/file.pdf', 7200);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 7200 },
    );
  });

  it('should delete an object', async () => {
    await service.deleteObject('owner/mission/file.pdf');
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('should throw if a required config key is missing', () => {
    const config = {
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        throw new Error(`Missing config: ${key}`);
      }),
    } as unknown as ConfigService;

    expect(() => new S3StorageService(config)).toThrow();
  });

  // ── getDownloadUrl — S3_PUBLIC_ENDPOINT rewrite ───────────────────────────

  it('should rewrite internal hostname in presigned URL when S3_PUBLIC_ENDPOINT is set', async () => {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    vi.mocked(getSignedUrl).mockResolvedValueOnce('http://minio:9000/bucket/key?X-Amz-Signature=abc');

    const svc = new S3StorageService(
      makeConfig({
        S3_ENDPOINT: 'http://minio:9000',
        S3_PUBLIC_ENDPOINT: 'https://storage.example.com',
      }),
    );
    const url = await svc.getDownloadUrl('some/key.pdf');

    expect(url).toBe('https://storage.example.com/bucket/key?X-Amz-Signature=abc');
  });

  // ── getObjectStream ───────────────────────────────────────────────────────

  it('should return a readable stream when Body is present', async () => {
    const fakeStream = { pipe: vi.fn() };
    mockSend.mockResolvedValueOnce({ Body: fakeStream });

    const stream = await service.getObjectStream('owner/mission/file.pdf');

    expect(mockSend).toHaveBeenCalledOnce();
    expect(stream).toBe(fakeStream);
  });

  it('should throw NotFoundException when Body is null', async () => {
    mockSend.mockResolvedValueOnce({ Body: null });

    await expect(service.getObjectStream('owner/mission/missing.pdf')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should propagate S3 errors from getObjectStream', async () => {
    mockSend.mockRejectedValueOnce(new Error('NoSuchKey'));

    await expect(service.getObjectStream('owner/mission/gone.pdf')).rejects.toThrow('NoSuchKey');
  });
});
