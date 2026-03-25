import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SendReportRequest, SendReportResponse } from '@esn/shared-types';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { reportsApi } from './reports';
import { apiClient } from './client';

const mockedApiClient = vi.mocked(apiClient);

describe('reportsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── sendMonthlyReport ──────────────────────────────────────────────────────

  it('sendMonthlyReport — calls POST /reports/monthly/:year/:month/send with correct body', async () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp/2026/3/CRA_ONLY-123.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: [],
    };
    mockedApiClient.post.mockResolvedValueOnce(mockResponse);

    const payload: SendReportRequest = {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: ['ESN'],
    };
    const result = await reportsApi.sendMonthlyReport(2026, 3, payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/reports/monthly/2026/3/send',
      payload,
    );
    expect(result).toEqual(mockResponse);
  });

  it('sendMonthlyReport — URL uses the year and month params (not the body fields)', async () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN', 'CLIENT'],
      pdfS3Key: 'reports/emp/2025/12/CRA_WITH_WEATHER-456.pdf',
      auditLogId: 'audit-2',
      skippedRecipients: [],
    };
    mockedApiClient.post.mockResolvedValueOnce(mockResponse);

    const payload: SendReportRequest = {
      year: 2025,
      month: 12,
      reportType: 'CRA_WITH_WEATHER',
      recipients: ['ESN', 'CLIENT'],
    };
    await reportsApi.sendMonthlyReport(2025, 12, payload);

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/reports/monthly/2025/12/send',
      payload,
    );
  });
});
