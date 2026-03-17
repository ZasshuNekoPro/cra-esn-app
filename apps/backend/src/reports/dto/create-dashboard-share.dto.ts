import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateDashboardShareDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  ttlHours?: number;
}
