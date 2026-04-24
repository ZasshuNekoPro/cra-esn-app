// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';

// Break the next-auth/react → next/server import chain
vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

// useSendReport uses clientApiClient.post directly (not reportsApi)
const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('../lib/api/clientFetch', () => ({
  clientApiClient: {
    post: mockPost,
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useSendReport } from './useSendReport';

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

  it('calls clientApiClient.post with correct path and payload on mutate', async () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp/2026/3/CRA_ONLY-ts.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: [],
    };
    mockPost.mockResolvedValueOnce(mockResponse);

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

    expect(mockPost).toHaveBeenCalledWith('/reports/monthly/2026/3/send', payload);
    expect(result.current.data).toEqual(mockResponse);
  });

  it('exposes isPending while the mutation is in flight', async () => {
    let resolvePromise!: (v: SendReportResponse) => void;
    const pendingPromise = new Promise<SendReportResponse>((res) => {
      resolvePromise = res;
    });
    mockPost.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useSendReport(2026, 3), {
      wrapper: makeWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ year: 2026, month: 3, reportType: 'CRA_ONLY', recipients: ['ESN'] });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

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
    mockPost.mockResolvedValueOnce(mockResponse);

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
    mockPost.mockRejectedValueOnce(new Error('network error'));

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
