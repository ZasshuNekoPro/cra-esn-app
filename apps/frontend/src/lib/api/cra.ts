import { apiClient } from './client';
import type { CraMonth, CraEntry } from '@esn/shared-types';
import type {
  CraMonthSummary,
  CreateCraEntryRequest,
  UpdateCraEntryRequest,
  PendingCraListResponse,
} from '@esn/shared-types';

export const craApi = {
  getOrCreateMonth: (year: number, month: number): Promise<CraMonth> =>
    apiClient.get<CraMonth>(`/cra/months/${year}/${month}`),

  getMonth: (id: string): Promise<CraMonth & { entries: CraEntry[] }> =>
    apiClient.get(`/cra/months/${id}`),

  getSummary: (id: string): Promise<CraMonthSummary> =>
    apiClient.get(`/cra/months/${id}/summary`),

  createEntry: (id: string, body: CreateCraEntryRequest): Promise<CraEntry> =>
    apiClient.post(`/cra/months/${id}/entries`, body),

  updateEntry: (id: string, eid: string, body: UpdateCraEntryRequest): Promise<CraEntry> =>
    apiClient.patch(`/cra/months/${id}/entries/${eid}`, body),

  deleteEntry: (id: string, eid: string): Promise<void> =>
    apiClient.delete(`/cra/months/${id}/entries/${eid}`),

  submit: (id: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/submit`),

  retract: (id: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/retract`),

  signEmployee: (id: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/sign-employee`),

  signEsn: (id: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/sign-esn`),

  rejectEsn: (id: string, comment: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/reject-esn`, { comment }),

  signClient: (id: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/sign-client`),

  rejectClient: (id: string, comment: string): Promise<CraMonth> =>
    apiClient.post(`/cra/months/${id}/reject-client`, { comment }),

  getPendingEsn: (): Promise<PendingCraListResponse> =>
    apiClient.get<PendingCraListResponse>('/cra/pending-esn'),
};
