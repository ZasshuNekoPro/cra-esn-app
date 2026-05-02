import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsUUID,
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

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  // null explicitly removes the client assignment
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  // null explicitly removes the ESN admin assignment
  @IsOptional()
  @IsUUID()
  esnAdminId?: string | null;
}
