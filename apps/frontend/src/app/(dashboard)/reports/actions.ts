'use server';

import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';
import { reportsApi } from '../../../lib/api/reports';

export async function sendMonthlyReportAction(
  payload: SendReportRequest,
): Promise<SendReportResponse> {
  return reportsApi.sendMonthlyReport(payload.year, payload.month, payload);
}
