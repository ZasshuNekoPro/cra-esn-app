import { apiClient } from './client';
import { clientApiClient } from './clientFetch';
import type { Esn, CreateEsnRequest, PlatformStats } from '@esn/shared-types';

// Server-side (Server Components)
export const esnApi = {
  list: (): Promise<Esn[]> => apiClient.get<Esn[]>('/esn'),
  getStats: (): Promise<PlatformStats> => apiClient.get<PlatformStats>('/esn/stats'),
};

// Client-side (Client Components / 'use client')
export const esnClientApi = {
  list: (): Promise<Esn[]> => clientApiClient.get<Esn[]>('/esn'),
  create: (data: CreateEsnRequest): Promise<Esn> => clientApiClient.post<Esn>('/esn', data),
};
