import { IsUUID, IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class RequestConsentDto {
  @IsUUID()
  employeeId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scope!: string[];
}
