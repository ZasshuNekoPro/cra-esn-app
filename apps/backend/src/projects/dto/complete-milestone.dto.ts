import { IsOptional, Matches } from 'class-validator';

export class CompleteMilestoneDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'validatedAt must be YYYY-MM-DD' })
  validatedAt?: string;
}
