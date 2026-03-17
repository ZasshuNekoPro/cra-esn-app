import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageService } from '../storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.getOrThrow<string>('S3_ENDPOINT');
    const region = config.getOrThrow<string>('S3_REGION');
    const accessKeyId = config.getOrThrow<string>('S3_ACCESS_KEY');
    const secretAccessKey = config.getOrThrow<string>('S3_SECRET_KEY');
    this.bucket = config.getOrThrow<string>('S3_BUCKET');

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // required for MinIO, OVH, Scaleway
    });
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    await this.client.send(command);
    this.logger.log(`Uploaded ${key} (${mimeType})`);
    return key;
  }

  async getDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
    return url;
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(command);
    this.logger.log(`Deleted ${key}`);
  }
}
