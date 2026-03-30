import { apiClient } from './client';
import { clientApiClient } from './clientFetch';
import type { CreateUserRequest } from '@esn/shared-types';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  createdAt: string;
}

// Server-side (Server Components)
export const usersApi = {
  list: (): Promise<PublicUser[]> => apiClient.get<PublicUser[]>('/users'),
  findOne: (id: string): Promise<PublicUser> => apiClient.get<PublicUser>(`/users/${id}`),
};

// Client-side (Client Components / 'use client')
export const usersClientApi = {
  list: (): Promise<PublicUser[]> => clientApiClient.get<PublicUser[]>('/users'),
  create: (data: CreateUserRequest): Promise<PublicUser> => clientApiClient.post<PublicUser>('/users', data),
  delete: (id: string): Promise<void> => clientApiClient.delete<void>(`/users/${id}`),
};
