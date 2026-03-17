import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { DocumentType } from '@esn/shared-types';

export class ListDocumentsDto {
  @IsUUID()
  @IsOptional()
  missionId?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;
}
