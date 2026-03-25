'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';
import { reportsApi } from '../lib/api/reports';

export function useSendReport(
  year: number,
  month: number,
): UseMutationResult<SendReportResponse, Error, SendReportRequest> {
  const queryClient = useQueryClient();

  return useMutation<SendReportResponse, Error, SendReportRequest>({
    mutationFn: (payload: SendReportRequest) =>
      reportsApi.sendMonthlyReport(year, month, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', year, month] });
    },
  });
}
