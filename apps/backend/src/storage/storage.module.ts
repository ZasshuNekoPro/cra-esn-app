import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3StorageService } from './drivers/s3.storage';
import { LocalStorageService } from './drivers/local.storage';
import { IStorageService, STORAGE_SERVICE } from './storage.interface';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    S3StorageService,
    LocalStorageService,
    StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (
        config: ConfigService,
        s3: S3StorageService,
        local: LocalStorageService,
      ): IStorageService => {
        const driver = config.get<string>('STORAGE_DRIVER', 's3');
        return driver === 'local' ? local : s3;
      },
      inject: [ConfigService, S3StorageService, LocalStorageService],
    },
  ],
  exports: [STORAGE_SERVICE, StorageService],
})
export class StorageModule {}
