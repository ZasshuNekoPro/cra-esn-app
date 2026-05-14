import type { Readable } from 'stream';

export interface IStorageService {
  uploadFile(buffer: Buffer, key: string, mimeType: string, sizeBytes: number): Promise<string>;
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getObjectStream(key: string): Promise<Readable>;
  deleteObject(key: string): Promise<void>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
