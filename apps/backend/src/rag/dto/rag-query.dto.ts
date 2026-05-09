import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsNumber, IsObject, IsBoolean, ValidateNested, MaxLength, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { RagFilters, ConversationTurn, RagSourceType, RagMode } from '@esn/shared-types';

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
  @IsUUID()
  missionId?: string;

  /** Nulled out server-side when missionId is present to enforce mutual exclusivity */
  @IsOptional()
  @IsString()
  @Transform(({ obj, value }) => (obj.missionId ? undefined : value))
  projectId?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsBoolean()
  includeNonDocumentSources?: boolean;
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

  @IsOptional()
  @IsEnum(['question', 'information'])
  mode?: RagMode;
}
