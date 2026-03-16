import { IsString, MinLength } from 'class-validator';

export class RejectCraMonthDto {
  @IsString()
  @MinLength(10, { message: 'Rejection comment must be at least 10 characters' })
  comment!: string;
}
