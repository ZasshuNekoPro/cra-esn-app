'use server';

import { apiClient, ApiClientError } from '../../../lib/api/client';

export async function resetPasswordAction(
  token: string,
  password: string,
): Promise<{ error?: string }> {
  try {
    await apiClient.post<void>('/auth/reset-password', { token, password });
    return {};
  } catch (err) {
    if (err instanceof ApiClientError && (err.statusCode === 400 || err.statusCode === 401)) {
      return { error: 'Token invalide ou expiré. Veuillez recommencer.' };
    }
    return { error: 'Une erreur est survenue. Veuillez réessayer.' };
  }
}
