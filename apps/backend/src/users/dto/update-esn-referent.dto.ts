import { IsUUID, IsOptional } from 'class-validator';

export class UpdateEsnReferentDto {
  @IsOptional()
  @IsUUID()
  esnReferentId: string | null = null;
}
