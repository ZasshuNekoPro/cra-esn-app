import { IsString, IsOptional } from 'class-validator';

export class DecideValidationDto {
  @IsOptional()
  @IsString()
  decisionComment?: string;
}
