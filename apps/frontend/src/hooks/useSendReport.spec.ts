// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';

// Mock reportsApi
vi.mock('../lib/api/reports', () => ({
  reportsApi: {
    sendMonthlyReport: vi.fn(),
  },
}));

import { useSendReport } from './useSendReport';
import { reportsApi } from '../lib/api/reports';

const mockedSendMonthlyReport = vi.mocked(reportsApi.sendMonthlyReport);

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useSendReport', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('calls reportsApi.sendMonthlyReport with correct arguments on mutate', async () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp/2026/3/CRA_ONLY-ts.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: [],
    };
    mockedSendMonthlyReport.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSendReport(2026, 3), {
      wrapper: makeWrapper(queryClient),
    });

    const payload: SendReportRequest = {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    };

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedSendMonthlyReport).toHaveBeenCalledWith(2026, 3, payload);
    expect(result.current.data).toEqual(mockResponse);
  });

  it('exposes isPending while the mutation is in flight', async () => {
    let resolvePromise!: (v: SendReportResponse) => void;
    const pendingPromise = new Promise<SendReportResponse>((res) => {
      resolvePromise = res;
    });
    mockedSendMonthlyReport.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useSendReport(2026, 3), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ year: 2026, month: 3, reportType: 'CRA_ONLY', recipients: ['ESN'] });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Resolve and clean up
    act(() => {
      resolvePromise({
        success: true,
        sentTo: ['ESN'],
        pdfS3Key: 'k',
        auditLogId: 'a',
        skippedRecipients: [],
      });
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('invalidates ["reports", year, month] cache on success', async () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp/2026/3/CRA_ONLY-ts.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: [],
    };
    mockedSendMonthlyReport.mockResolvedValueOnce(mockResponse);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSendReport(2026, 3), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ year: 2026, month: 3, reportType: 'CRA_ONLY', recipients: ['ESN'] });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports', 2026, 3] });
  });

  it('exposes error when the mutation fails', async () => {
    mockedSendMonthlyReport.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useSendReport(2026, 3), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ year: 2026, month: 3, reportType: 'CRA_ONLY', recipients: ['ESN'] });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
