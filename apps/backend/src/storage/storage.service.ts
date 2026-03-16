import { Injectable, Logger } from '@nestjs/common';

/**
 * StorageService — abstraction over MinIO/S3 for file upload.
 *
 * In dev/test environments, returns a mock MinIO URL.
 * In production, integrate with AWS S3 or a configured MinIO instance.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /**
   * Upload a buffer to object storage.
   *
   * @param key         Object key (path), e.g. "cra/employee-id/2026/03/cra-xxx.pdf"
   * @param buffer      File content
   * @param contentType MIME type, e.g. "application/pdf"
   * @returns           Public URL of the uploaded object
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    // TODO (production): replace with real S3/MinIO SDK call
    // Example using @aws-sdk/client-s3:
    //   const command = new PutObjectCommand({ Bucket: 'cra', Key: key, Body: buffer, ContentType: contentType });
    //   await this.s3Client.send(command);
    //   return `https://${bucket}.s3.amazonaws.com/${key}`;
    this.logger.log(`Uploading ${key} (${contentType}, ${buffer.length} bytes)`);
    return Promise.resolve(`http://minio:9000/cra/${key}`);
  }
}
