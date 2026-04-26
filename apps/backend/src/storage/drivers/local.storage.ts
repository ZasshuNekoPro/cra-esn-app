import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import type { Readable } from 'stream';
import * as path from 'path';
import type { IStorageService } from '../storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;
  private readonly backendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.basePath = config.get<string>('LOCAL_STORAGE_PATH', './uploads');
    this.backendUrl = config.get<string>('BACKEND_URL', 'http://localhost:3101');
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<string> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    this.logger.log(`Stored locally: ${filePath} (${mimeType}, ${sizeBytes} bytes)`);
    return key;
  }

  async getDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const filePath = this.resolvePath(key);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException(`File not found: ${key}`);
    }
    // Local URLs don't expire; expiresInSeconds is ignored (no presigning capability)
    void expiresInSeconds;
    // Return the NestJS storage endpoint URL; access is controlled by JwtAuthGuard
    const encodedKey = encodeURIComponent(key);
    return `${this.backendUrl}/api/storage/${encodedKey}`;
  }

  async getObjectStream(key: string): Promise<Readable> {
    const filePath = this.resolvePath(key);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException(`File not found: ${key}`);
    }
    return createReadStream(filePath);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    try {
      await fs.unlink(filePath);
    } catch {
      this.logger.warn(`Delete attempted on non-existent file: ${key}`);
    }
  }

  private resolvePath(key: string): string {
    return path.resolve(this.basePath, key);
  }
}
