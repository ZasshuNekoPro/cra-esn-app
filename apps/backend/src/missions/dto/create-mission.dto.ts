import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsPositive,
  IsUUID,
  IsArray,
  ArrayMinSize,
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

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  employeeIds!: string[];

  @IsOptional()
  @IsUUID()
  esnAdminId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
