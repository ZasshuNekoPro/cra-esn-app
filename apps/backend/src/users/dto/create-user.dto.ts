import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@esn/shared-types';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}
