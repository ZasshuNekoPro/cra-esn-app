import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Serves locally stored files.
 * Only active when STORAGE_DRIVER=local.
 * Protected by the global JwtAuthGuard — no public access.
 */
@Controller('storage')
export class StorageController {
  private readonly basePath: string;

  constructor(config: ConfigService) {
    this.basePath = config.get<string>('LOCAL_STORAGE_PATH', './uploads');
  }

  @Get(':key(*)')
  serveFile(@Param('key') encodedKey: string, @Res() res: Response): void {
    const key = decodeURIComponent(encodedKey);
    // Prevent path traversal
    const resolved = path.resolve(this.basePath, key);
    if (!resolved.startsWith(path.resolve(this.basePath))) {
      throw new NotFoundException();
    }
    if (!fs.existsSync(resolved)) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    res.sendFile(resolved);
  }
}
