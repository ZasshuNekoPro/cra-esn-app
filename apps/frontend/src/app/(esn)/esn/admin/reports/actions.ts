'use server';

import { revalidatePath } from 'next/cache';
import { reportsApi } from '../../../../../lib/api/reports';

export async function archiveValidationAction(id: string): Promise<void> {
  await reportsApi.archiveValidation(id);
  revalidatePath('/esn/admin/reports');
}

export async function remindValidationAction(id: string): Promise<void> {
  await reportsApi.remindValidation(id);
  revalidatePath('/esn/admin/reports');
}
