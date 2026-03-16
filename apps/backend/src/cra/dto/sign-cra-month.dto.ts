import { IsBoolean, IsOptional } from 'class-validator';

export class SignCraMonthDto {
  @IsOptional()
  @IsBoolean()
  includeProjectsSummary?: boolean;
}
