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
  createdAt: string;
}

// Server-side (Server Components & Server Actions)
export const usersApi = {
  list: (): Promise<PublicUser[]> => apiClient.get<PublicUser[]>('/users'),
  findOne: (id: string): Promise<PublicUser> => apiClient.get<PublicUser>(`/users/${id}`),
  create: (data: CreateUserRequest): Promise<PublicUser> => apiClient.post<PublicUser>('/users', data),
  update: (
    id: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<PublicUser> => apiClient.patch<PublicUser>(`/users/${id}`, data),
};

// Client-side (Client Components / 'use client')
export const usersClientApi = {
  list: (): Promise<PublicUser[]> => clientApiClient.get<PublicUser[]>('/users'),
  create: (data: CreateUserRequest): Promise<PublicUser> => clientApiClient.post<PublicUser>('/users', data),
  update: (id: string, data: { firstName?: string; lastName?: string; phone?: string }): Promise<PublicUser> =>
    clientApiClient.patch<PublicUser>(`/users/${id}`, data),
  delete: (id: string): Promise<void> => clientApiClient.delete<void>(`/users/${id}`),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }): Promise<PublicUser> =>
    clientApiClient.patch<PublicUser>('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<void> =>
    clientApiClient.post<void>('/users/me/change-password', data),
};
