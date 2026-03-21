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
};
