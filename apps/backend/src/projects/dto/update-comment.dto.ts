import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CommentVisibility } from '@esn/shared-types';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(CommentVisibility)
  visibility?: CommentVisibility;
}
