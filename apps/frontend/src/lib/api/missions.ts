import { apiClient } from './client';
import { clientApiClient } from './clientFetch';
import type { CreateMissionRequest } from '@esn/shared-types';

export interface MissionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  dailyRate: number | null;
  isActive: boolean;
  employeeId: string;
  esnAdminId: string | null;
  clientId: string | null;
  employee?: MissionUser;
  esnAdmin?: MissionUser | null;
  client?: MissionUser | null;
}

export interface UpdateMissionRequest {
  title?: string;
  description?: string;
  endDate?: string;
  dailyRate?: number;
  isActive?: boolean;
}

// Server-side
export const missionsApi = {
  list: (): Promise<Mission[]> => apiClient.get<Mission[]>('/missions'),
  findOne: (id: string): Promise<Mission> => apiClient.get<Mission>(`/missions/${id}`),
  create: (data: CreateMissionRequest): Promise<Mission> => apiClient.post<Mission>('/missions', data),
  update: (id: string, data: UpdateMissionRequest): Promise<Mission> =>
    apiClient.put<Mission>(`/missions/${id}`, data),
  deactivate: (id: string): Promise<void> => apiClient.delete<void>(`/missions/${id}`),
};

// Client-side
export const missionsClientApi = {
  list: (): Promise<Mission[]> => clientApiClient.get<Mission[]>('/missions'),
  create: (data: CreateMissionRequest): Promise<Mission> => clientApiClient.post<Mission>('/missions', data),
  update: (id: string, data: UpdateMissionRequest): Promise<Mission> => clientApiClient.put<Mission>(`/missions/${id}`, data),
  deactivate: (id: string): Promise<void> => clientApiClient.delete<void>(`/missions/${id}`),
};
