import { Inject, Injectable } from '@nestjs/common';
import { IStorageService, STORAGE_SERVICE } from './storage.interface';

/**
 * Thin facade so existing code can inject StorageService directly
 * while the actual implementation is selected at runtime via STORAGE_DRIVER.
 */
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

  deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }
}
