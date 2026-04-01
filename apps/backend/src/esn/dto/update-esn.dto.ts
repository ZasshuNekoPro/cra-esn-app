import { IsString, IsNotEmpty, IsOptional, IsUrl, Matches } from 'class-validator';

export class UpdateEsnDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'siret must be exactly 14 digits' })
  siret?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
