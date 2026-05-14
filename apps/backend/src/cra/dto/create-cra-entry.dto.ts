import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CraEntryType, CraEntryModifier, PortionType } from '@esn/shared-types';

class ProjectEntryItemDto {
  @IsString()
  projectId!: string;

  @IsEnum(PortionType)
  portion!: PortionType;
}

export class CreateCraEntryDto {
  /** ISO date string YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsEnum(CraEntryType)
  entryType!: CraEntryType;

  /** 0.5 or 1.0 */
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  dayFraction!: number;

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
