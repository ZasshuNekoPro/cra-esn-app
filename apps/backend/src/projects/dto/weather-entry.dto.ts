import { IsString, IsEnum, IsOptional, Matches } from 'class-validator';
import { WeatherState } from '@esn/shared-types';

export class CreateWeatherEntryDto {
  /** ISO date YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsEnum(WeatherState)
  state!: WeatherState;

  @IsOptional()
  @IsString()
  comment?: string;
}
