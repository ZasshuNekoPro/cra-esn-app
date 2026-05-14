'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { UseMutationResult } from '@tanstack/react-query';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';
import { sendMonthlyReportAction } from '../app/(dashboard)/reports/actions';

export function useSendReport(
  year: number,
  month: number,
): UseMutationResult<SendReportResponse, Error, SendReportRequest> {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<SendReportResponse, Error, SendReportRequest>({
    mutationFn: async (payload: SendReportRequest) => {
      const result = await sendMonthlyReportAction(payload);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', year, month] });
      router.refresh();
    },
  });
}
