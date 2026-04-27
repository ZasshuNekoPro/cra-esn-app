import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsEnum, IsEmail, MinLength, IsArray, IsUrl, Matches, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientContactType } from '@esn/shared-types';

export class CreateContactDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsEnum(ClientContactType) contactType!: ClientContactType;
  @IsOptional() @IsString() phone?: string;
}

export class CreateClientCompanyDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() @Matches(/^\d{9}$/, { message: 'SIREN must be exactly 9 digits' }) siren?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsUrl({}, { message: 'website must be a valid URL' }) website?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CreateContactDto) contacts!: CreateContactDto[];
}