'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';
import { clientApiClient } from '../lib/api/clientFetch';

export function useSendReport(
  year: number,
  month: number,
): UseMutationResult<SendReportResponse, Error, SendReportRequest> {
  const queryClient = useQueryClient();

  return useMutation<SendReportResponse, Error, SendReportRequest>({
    mutationFn: (payload: SendReportRequest) =>
      clientApiClient.post<SendReportResponse>(`/reports/monthly/${year}/${month}/send`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', year, month] });
    },
  });
}
