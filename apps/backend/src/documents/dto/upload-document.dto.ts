import { IsString, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { DocumentType } from '@esn/shared-types';

export class UploadDocumentDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsUUID()
  missionId!: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}
