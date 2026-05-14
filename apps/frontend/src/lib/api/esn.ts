import { apiClient } from './client';
import { clientApiClient } from './clientFetch';
import type { Esn, CreateEsnRequest, PlatformStats, AuditLogListResponse } from '@esn/shared-types';

// Server-side (Server Components)
export const esnApi = {
  list: (): Promise<Esn[]> => apiClient.get<Esn[]>('/esn'),
  getStats: (): Promise<PlatformStats> => apiClient.get<PlatformStats>('/esn/stats'),
  getAuditLogs: (params: {
    action?: string;
    initiatorId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogListResponse> => {
    const qs = new URLSearchParams();
    if (params.action) qs.set('action', params.action);
    if (params.initiatorId) qs.set('initiatorId', params.initiatorId);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return apiClient.get<AuditLogListResponse>(`/esn/audit-logs${query ? `?${query}` : ''}`);
  },
};

// Client-side (Client Components / 'use client')
export const esnClientApi = {
  list: (): Promise<Esn[]> => clientApiClient.get<Esn[]>('/esn'),
  create: (data: CreateEsnRequest): Promise<Esn> => clientApiClient.post<Esn>('/esn', data),
  getAuditLogs: (params: {
    action?: string;
    initiatorId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogListResponse> => {
    const qs = new URLSearchParams();
    if (params.action) qs.set('action', params.action);
    if (params.initiatorId) qs.set('initiatorId', params.initiatorId);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return clientApiClient.get<AuditLogListResponse>(`/esn/audit-logs${query ? `?${query}` : ''}`);
  },
};
