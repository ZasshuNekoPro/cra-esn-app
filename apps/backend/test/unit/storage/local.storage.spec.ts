import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

// ── Mock fs/promises ──────────────────────────────────────────────────────────

const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockAccess = vi.fn().mockResolvedValue(undefined);
const mockUnlink = vi.fn().mockResolvedValue(undefined);

vi.mock('fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  access: (...args: unknown[]) => mockAccess(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

// ── Mock fs (createReadStream) ────────────────────────────────────────────────

const mockCreateReadStream = vi.fn();
vi.mock('fs', () => ({
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    LOCAL_STORAGE_PATH: '/tmp/test-uploads',
    BACKEND_URL: 'http://localhost:3001',
    ...overrides,
  };
  return {
    get: vi.fn((key: string, def?: string) => values[key] ?? def),
    getOrThrow: vi.fn((key: string) => {
      if (key in values) return values[key];
      throw new Error(`Missing config: ${key}`);
    }),
  } as unknown as ConfigService;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LocalStorageService', () => {
  // Import after mocks are set up
  let service: import('../../../src/storage/drivers/local.storage').LocalStorageService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { LocalStorageService } = await import('../../../src/storage/drivers/local.storage');
    service = new LocalStorageService(makeConfig());
  });

  it('should write file to disk and return the key', async () => {
    const buffer = Buffer.from('content');
    const result = await service.uploadFile(buffer, 'owner/mission/doc.pdf', 'application/pdf', 7);

    expect(mockMkdir).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledOnce();
    expect(result).toBe('owner/mission/doc.pdf');
  });

  it('should return a local backend URL for an existing file', async () => {
    const url = await service.getDownloadUrl('owner/mission/doc.pdf');

    expect(url).toContain('http://localhost:3001/api/storage/');
    expect(url).toContain('owner');
  });

  it('should throw NotFoundException when file does not exist', async () => {
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(service.getDownloadUrl('missing/file.pdf')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should delete an existing file', async () => {
    await service.deleteObject('owner/mission/doc.pdf');
    expect(mockUnlink).toHaveBeenCalledOnce();
  });

  it('should silently ignore delete of non-existent file', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('ENOENT'));
    await expect(service.deleteObject('missing/file.pdf')).resolves.toBeUndefined();
  });

  // ── getObjectStream ───────────────────────────────────────────────────────

  it('should return a ReadStream for an existing file', async () => {
    const fakeStream = { pipe: vi.fn() };
    mockCreateReadStream.mockReturnValueOnce(fakeStream);

    const stream = await service.getObjectStream('owner/mission/doc.pdf');

    expect(mockAccess).toHaveBeenCalledOnce();
    expect(mockCreateReadStream).toHaveBeenCalledOnce();
    expect(stream).toBe(fakeStream);
  });

  it('should throw NotFoundException when file is missing', async () => {
    mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

    await expect(service.getObjectStream('missing/file.pdf')).rejects.toThrow(NotFoundException);
    expect(mockCreateReadStream).not.toHaveBeenCalled();
  });
});
