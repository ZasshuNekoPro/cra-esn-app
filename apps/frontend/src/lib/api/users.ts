import { apiClient } from './client';
import { clientApiClient } from './clientFetch';
import { Role, ClientContactType } from '@esn/shared-types';
import type { CreateUserRequest } from '@esn/shared-types';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  company: string | null;
  clientCompanyId: string | null;
  clientContactType: ClientContactType | null;
  esnReferentId: string | null;
  createdAt: string;
}

export interface EsnAdmin {
  id: string;
  firstName: string;
  lastName: string;
}

// Server-side (Server Components & Server Actions)
export const usersApi = {
  list: (): Promise<PublicUser[]> => apiClient.get<PublicUser[]>('/users'),
  findOne: (id: string): Promise<PublicUser> => apiClient.get<PublicUser>(`/users/${id}`),
  listAdmins: (): Promise<EsnAdmin[]> => apiClient.get<EsnAdmin[]>('/users/esn-admins'),
  create: (data: CreateUserRequest): Promise<PublicUser> => apiClient.post<PublicUser>('/users', data),
  update: (
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<PublicUser> => apiClient.patch<PublicUser>(`/users/${id}`, data),
  setEsnReferent: (id: string, esnReferentId: string | null): Promise<PublicUser> =>
    apiClient.patch<PublicUser>(`/users/${id}/esn-referent`, { esnReferentId }),
};

// Client-side (Client Components / 'use client')
export const usersClientApi = {
  list: (): Promise<PublicUser[]> => clientApiClient.get<PublicUser[]>('/users'),
  listAdmins: (): Promise<EsnAdmin[]> => clientApiClient.get<EsnAdmin[]>('/users/esn-admins'),
  create: (data: CreateUserRequest): Promise<PublicUser> => clientApiClient.post<PublicUser>('/users', data),
  update: (id: string, data: { firstName?: string; lastName?: string; phone?: string }): Promise<PublicUser> =>
    clientApiClient.patch<PublicUser>(`/users/${id}`, data),
  setEsnReferent: (id: string, esnReferentId: string | null): Promise<PublicUser> =>
    clientApiClient.patch<PublicUser>(`/users/${id}/esn-referent`, { esnReferentId }),
  delete: (id: string): Promise<void> => clientApiClient.delete<void>(`/users/${id}`),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }): Promise<PublicUser> =>
    clientApiClient.patch<PublicUser>('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<void> =>
    clientApiClient.post<void>('/users/me/change-password', data),
};
