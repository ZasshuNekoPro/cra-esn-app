import { auth } from '../../auth';
import type { ApiError } from '@esn/shared-types';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3101';

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function getAccessToken(): Promise<string | null> {
  // Server-side: use the session from NextAuth
  const session = await auth();
  return session?.accessToken ?? null;
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = await getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...options,
    cache: 'no-store',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = (await res.json()) as ApiError;
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message;
    throw new ApiClientError(res.status, message);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<T> =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
