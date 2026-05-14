import { apiClient } from './client';
import type {
  MonthlyReport,
  ProjectPresentation,
  CreateDashboardShareRequest,
  DashboardShareResponse,
  PublicDashboard,
  SendReportRequest,
  SendReportResponse,
  SentReportHistoryItem,
  ReportDownloadResponse,
  ReportValidationItem,
  ReportValidationItemForEsn,
  ValidationCraPreview,
} from '@esn/shared-types';

export const reportsApi = {
  getMonthlyReport: (year: number, month: number): Promise<MonthlyReport> =>
    apiClient.get<MonthlyReport>(`/reports/monthly/${year}/${month}`),

  getProjectPresentation: (
    projectId: string,
    from?: string,
    to?: string,
  ): Promise<ProjectPresentation> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return apiClient.get<ProjectPresentation>(`/reports/projects/${projectId}${qs ? `?${qs}` : ''}`);
  },

  createDashboardShare: (dto: CreateDashboardShareRequest): Promise<DashboardShareResponse> =>
    apiClient.post<DashboardShareResponse>('/reports/dashboard-share', dto),

  revokeDashboardShare: (token: string): Promise<void> =>
    apiClient.delete<void>(`/reports/dashboard-share/${token}`),

  getPublicDashboard: (token: string): Promise<PublicDashboard> =>
    apiClient.get<PublicDashboard>(`/reports/shared/${token}`),

  sendMonthlyReport: (
    year: number,
    month: number,
    payload: SendReportRequest,
  ): Promise<SendReportResponse> =>
    apiClient.post<SendReportResponse>(`/reports/monthly/${year}/${month}/send`, payload),

  getSentHistory: (): Promise<SentReportHistoryItem[]> =>
    apiClient.get<SentReportHistoryItem[]>('/reports/sent-history'),

  downloadSentReport: (id: string): Promise<ReportDownloadResponse> =>
    apiClient.get<ReportDownloadResponse>(`/reports/sent-history/${id}/download`),

  listNotifications: (unreadOnly?: boolean): Promise<Notification[]> => {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return apiClient.get<Notification[]>(`/notifications${qs}`);
  },

  countUnread: (): Promise<{ unreadCount: number }> =>
    apiClient.get<{ unreadCount: number }>('/notifications/count'),

  markRead: (id: string): Promise<void> =>
    apiClient.patch<void>(`/notifications/${id}/read`),

  markAllRead: (): Promise<void> =>
    apiClient.patch<void>('/notifications/read-all'),

  listForClient: (): Promise<ReportValidationItem[]> =>
    apiClient.get<ReportValidationItem[]>('/reports/for-client'),

  listForEsn: (): Promise<ReportValidationItemForEsn[]> =>
    apiClient.get<ReportValidationItemForEsn[]>('/reports/for-esn'),

  getValidation: (id: string): Promise<ReportValidationItemForEsn> =>
    apiClient.get<ReportValidationItemForEsn>(`/reports/validation/${id}`),

  getValidationCraPreview: (id: string): Promise<ValidationCraPreview> =>
    apiClient.get<ValidationCraPreview>(`/reports/validation/${id}/cra-preview`),

  getValidationPdfUrl: (id: string): Promise<{ url: string }> =>
    apiClient.get<{ url: string }>(`/reports/validation/${id}/download`),

  archiveValidation: (id: string): Promise<void> =>
    apiClient.patch<void>(`/reports/validation/${id}/archive`),

  remindValidation: (id: string): Promise<void> =>
    apiClient.patch<void>(`/reports/validation/${id}/remind`),
};
