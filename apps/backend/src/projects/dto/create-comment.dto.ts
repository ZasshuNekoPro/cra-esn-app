import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { CommentVisibility } from '@esn/shared-types';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(CommentVisibility)
  visibility!: CommentVisibility;

  @IsOptional()
  @IsBoolean()
  isBlocker?: boolean;
}
