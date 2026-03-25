import {
  IsInt,
  IsIn,
  IsArray,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import type { ReportType, ReportRecipient } from '@esn/shared-types';

export class SendReportDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsIn(['CRA_ONLY', 'CRA_WITH_WEATHER'])
  reportType!: ReportType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(['ESN', 'CLIENT'], { each: true })
  recipients!: ReportRecipient[];
}
