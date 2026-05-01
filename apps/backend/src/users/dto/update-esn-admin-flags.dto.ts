import { IsBoolean } from 'class-validator';

export class UpdateEsnAdminFlagsDto {
  @IsBoolean()
  canSeeAllEsnReports!: boolean;
}
