import { Inject, Injectable } from '@nestjs/common';
import type { Readable } from 'stream';
import { IStorageService, STORAGE_SERVICE } from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly driver: IStorageService,
  ) {}

  uploadFile(buffer: Buffer, key: string, mimeType: string, sizeBytes: number): Promise<string> {
    return this.driver.uploadFile(buffer, key, mimeType, sizeBytes);
  }

  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.driver.getDownloadUrl(key, expiresInSeconds);
  }

  getObjectStream(key: string): Promise<Readable> {
    return this.driver.getObjectStream(key);
  }

  deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }
}
