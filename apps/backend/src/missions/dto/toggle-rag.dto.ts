import { IsBoolean } from 'class-validator';
import type { ToggleMissionRagRequest } from '@esn/shared-types';

export class ToggleRagDto implements ToggleMissionRagRequest {
  @IsBoolean()
  ragEnabled!: boolean;
}
