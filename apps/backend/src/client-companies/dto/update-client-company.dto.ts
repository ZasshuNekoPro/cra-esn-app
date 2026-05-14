import { IsString, IsNotEmpty, IsOptional, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateClientCompanyDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @Matches(/^\d{9}$/, { message: 'SIREN must be exactly 9 digits' }) siren?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsUrl({}, { message: 'website must be a valid URL' }) website?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
