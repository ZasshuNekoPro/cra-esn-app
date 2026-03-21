import { describe, it, expect } from 'vitest';
import type {
  SendReportRequest,
  SendReportResponse,
  ReportType,
  ReportRecipient,
} from './reports';

describe('SendReport shared types — structural integrity', () => {
  it('ReportType values are CRA_ONLY and CRA_WITH_WEATHER', () => {
    // TypeScript enforces the union at compile-time.
    // This runtime check documents the valid string values.
    const validTypes: ReportType[] = ['CRA_ONLY', 'CRA_WITH_WEATHER'];
    expect(validTypes).toHaveLength(2);
    expect(validTypes).toContain('CRA_ONLY');
    expect(validTypes).toContain('CRA_WITH_WEATHER');
  });

  it('ReportRecipient values are ESN and CLIENT', () => {
    const validRecipients: ReportRecipient[] = ['ESN', 'CLIENT'];
    expect(validRecipients).toHaveLength(2);
    expect(validRecipients).toContain('ESN');
    expect(validRecipients).toContain('CLIENT');
  });

  it('SendReportRequest with empty recipients is structurally valid (enforcement at DTO layer)', () => {
    // The shared type allows empty arrays — the ArrayMinSize guard lives in SendReportDto (T2).
    const request: SendReportRequest = {
      year: 2026,
      month: 3,
      reportType: 'CRA_ONLY',
      recipients: [],
    };
    expect(request.recipients).toHaveLength(0);
    expect(Array.isArray(request.recipients)).toBe(true);
  });

  it('SendReportResponse.skippedRecipients is always a typed array, never undefined', () => {
    const response: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp-uuid/2026/03/CRA_ONLY-1711234567890.pdf',
      auditLogId: 'audit-log-uuid-123',
      skippedRecipients: [],
    };
    expect(Array.isArray(response.skippedRecipients)).toBe(true);
    // skippedRecipients is required in the interface (never optional)
    expect(response.skippedRecipients).toBeDefined();
  });

  it('SendReportResponse with multiple sentTo and skippedRecipients', () => {
    const response: SendReportResponse = {
      success: true,
      sentTo: ['ESN', 'CLIENT'],
      pdfS3Key: 'reports/emp-uuid/2026/03/CRA_WITH_WEATHER-1711234567890.pdf',
      auditLogId: 'audit-log-uuid-456',
      skippedRecipients: [],
    };
    expect(response.sentTo).toHaveLength(2);
    expect(response.skippedRecipients).toHaveLength(0);
  });

  it('SendReportResponse when a recipient is skipped', () => {
    const response: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/emp-uuid/2026/03/CRA_ONLY-1711234567890.pdf',
      auditLogId: 'audit-log-uuid-789',
      skippedRecipients: ['CLIENT'],
    };
    expect(response.sentTo).toContain('ESN');
    expect(response.skippedRecipients).toContain('CLIENT');
  });

  it('SendReportRequest month is in valid range', () => {
    const request: SendReportRequest = {
      year: 2026,
      month: 12,
      reportType: 'CRA_WITH_WEATHER',
      recipients: ['ESN', 'CLIENT'],
    };
    expect(request.month).toBeGreaterThanOrEqual(1);
    expect(request.month).toBeLessThanOrEqual(12);
  });
});
