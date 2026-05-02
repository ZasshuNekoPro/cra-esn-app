'use server';

import { apiClient, ApiClientError } from '../../../lib/api/client';

export async function forgotPasswordAction(email: string): Promise<{ error?: string }> {
  try {
    await apiClient.post<void>('/auth/forgot-password', { email });
    return {};
  } catch (err) {
    if (err instanceof ApiClientError) {
      return { error: 'Une erreur est survenue. Veuillez réessayer.' };
    }
    return { error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}
