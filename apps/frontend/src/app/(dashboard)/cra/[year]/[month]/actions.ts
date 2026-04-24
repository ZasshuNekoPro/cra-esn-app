'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateCraAction(year: number, month: number): Promise<void> {
  revalidatePath(`/cra/${year}/${month}`);
}
