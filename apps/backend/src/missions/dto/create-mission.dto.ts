import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreateMissionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  dailyRate?: number;

  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsUUID()
  esnAdminId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
