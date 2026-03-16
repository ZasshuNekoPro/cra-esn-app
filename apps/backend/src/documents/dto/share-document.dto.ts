import { IsUUID } from 'class-validator';

export class ShareDocumentDto {
  @IsUUID()
  targetUserId!: string;
}
