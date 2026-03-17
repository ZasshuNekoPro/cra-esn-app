import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsNumber, IsObject, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { RagFilters, ConversationTurn, RagSourceType } from '@esn/shared-types';

export class ConversationTurnDto implements ConversationTurn {
  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}

export class RagFiltersDto implements RagFilters {
  @IsOptional()
  @IsArray()
  sourceType?: RagSourceType[];

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  month?: number;
}

export class RagQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  messages?: ConversationTurnDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RagFiltersDto)
  filters?: RagFiltersDto;
}
