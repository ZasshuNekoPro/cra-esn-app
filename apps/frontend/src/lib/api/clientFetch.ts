'use client';

import { getSession } from 'next-auth/react';
import type { ApiError } from '@esn/shared-types';
import { ApiClientError } from './client';

const BACKEND_URL = process.env['NEXT_PUBLIC_BACKEND_URL'] ?? 'http://localhost:3101';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function clientApiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const session = await getSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = (await res.json()) as ApiError;
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new ApiClientError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export const clientApiClient = {
  get: <T>(path: string): Promise<T> =>
    clientApiFetch<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    clientApiFetch<T>(path, { method: 'POST', body }),

  patch: <T>(path: string, body?: unknown): Promise<T> =>
    clientApiFetch<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string): Promise<T> =>
    clientApiFetch<T>(path, { method: 'DELETE' }),
};
