import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsBoolean,
} from 'class-validator';

export class UpdateMissionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  dailyRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
