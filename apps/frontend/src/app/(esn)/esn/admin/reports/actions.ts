'use server';

import { reportsApi } from '../../../../../lib/api/reports';

export async function archiveValidationAction(id: string): Promise<void> {
  await reportsApi.archiveValidation(id);
}

export async function remindValidationAction(id: string): Promise<void> {
  await reportsApi.remindValidation(id);
}
