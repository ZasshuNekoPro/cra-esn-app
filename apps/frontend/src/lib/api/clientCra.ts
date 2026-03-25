'use client';

import { clientApiFetch } from './clientFetch';
import type { CraEntry, CraMonth } from '@esn/shared-types';
import type {
  CreateCraEntryRequest,
  UpdateCraEntryRequest,
} from '@esn/shared-types';

export const clientCraApi = {
  createEntry: (id: string, body: CreateCraEntryRequest): Promise<CraEntry> =>
    clientApiFetch<CraEntry>(`/cra/months/${id}/entries`, { method: 'POST', body }),

  updateEntry: (id: string, eid: string, body: UpdateCraEntryRequest): Promise<CraEntry> =>
    clientApiFetch<CraEntry>(`/cra/months/${id}/entries/${eid}`, { method: 'PATCH', body }),

  deleteEntry: (id: string, eid: string): Promise<void> =>
    clientApiFetch<void>(`/cra/months/${id}/entries/${eid}`, { method: 'DELETE' }),

  submit: (id: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/submit`, { method: 'POST' }),

  retract: (id: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/retract`, { method: 'POST' }),

  signEmployee: (id: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/sign-employee`, { method: 'POST' }),

  signEsn: (id: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/sign-esn`, { method: 'POST' }),

  rejectEsn: (id: string, comment: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/reject-esn`, { method: 'POST', body: { comment } }),

  signClient: (id: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/sign-client`, { method: 'POST' }),

  rejectClient: (id: string, comment: string): Promise<CraMonth> =>
    clientApiFetch<CraMonth>(`/cra/months/${id}/reject-client`, { method: 'POST', body: { comment } }),
};
