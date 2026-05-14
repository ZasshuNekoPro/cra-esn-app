import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CraEntryType, CraEntryModifier, PortionType } from '@esn/shared-types';

class ProjectEntryItemDto {
  @IsString()
  projectId!: string;

  @IsEnum(PortionType)
  portion!: PortionType;
}

export class UpdateCraEntryDto {
  @IsOptional()
  @IsEnum(CraEntryType)
  entryType?: CraEntryType;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  dayFraction?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(CraEntryModifier, { each: true })
  modifiers?: CraEntryModifier[];

  @IsOptional()
  @IsEnum(CraEntryType)
  secondHalfType?: CraEntryType | null;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectEntryItemDto)
  projectEntries?: ProjectEntryItemDto[];
}
