import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Role } from '@esn/shared-types';

export class CreateValidationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(Role)
  targetRole!: Role;
}
