/**
 * Public API client for report validation endpoints.
 * No authentication required — uses native fetch without bearer token.
 */

import type {
  ValidateReportPublicInfo,
  ValidateReportRequest,
  ValidateReportResponse,
} from '@esn/shared-types';

const BACKEND_URL = process.env['NEXT_PUBLIC_BACKEND_URL'] ?? 'http://localhost:3101';

async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = (await res.json()) as { message?: string; statusCode?: number };
    const message = Array.isArray(error.message) ? error.message.join(', ') : (error.message ?? 'Erreur inconnue');
    const err = new Error(message);
    (err as Error & { statusCode?: number }).statusCode = error.statusCode ?? res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export const reportValidationsApi = {
  /** GET /reports/validate/:token — no auth */
  getValidationInfo: (token: string): Promise<ValidateReportPublicInfo> =>
    publicFetch<ValidateReportPublicInfo>(`/reports/validate/${token}`),

  /** POST /reports/validate/:token — no auth */
  submitValidation: (
    token: string,
    body: ValidateReportRequest,
  ): Promise<ValidateReportResponse> =>
    publicFetch<ValidateReportResponse>(`/reports/validate/${token}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
