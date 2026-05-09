import { IsString, IsBoolean, IsOptional, IsArray, MaxLength, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import type { UpsertDocumentMetadataRequest } from '@esn/shared-types';

export class UpsertDocumentMetadataDto implements UpsertDocumentMetadataRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsBoolean()
  isObsolete?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : null))
  documentDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceInvolved?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];
}
