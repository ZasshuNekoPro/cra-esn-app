import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { ValidateReportRequest } from '@esn/shared-types';

export class ValidateReportDto implements ValidateReportRequest {
  @IsIn(['VALIDATE', 'REFUSE'])
  action!: 'VALIDATE' | 'REFUSE';

  @IsString()
  @MinLength(1)
  validatorName!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
