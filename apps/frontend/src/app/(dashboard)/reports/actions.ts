'use server';

import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';
import { reportsApi } from '../../../lib/api/reports';

export type SendReportActionResult =
  | { ok: true; data: SendReportResponse }
  | { ok: false; error: string };

export async function sendMonthlyReportAction(
  payload: SendReportRequest,
): Promise<SendReportActionResult> {
  try {
    const data = await reportsApi.sendMonthlyReport(payload.year, payload.month, payload);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue lors de l\'envoi' };
  }
}
