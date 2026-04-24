import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientApiFetch, clientApiClient } from './clientFetch';
import { ApiClientError } from './client';

// Prevent auth.ts → next-auth → next-auth/lib/env.js → next/server chain from loading
// in the Node test environment (same mock used by client.spec.ts)
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Prevent clientFetch.ts's direct next-auth/react import from loading the real module
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('next-auth/react', () => ({
  getSession: mockGetSession,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('clientApiFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
  });

  it('returns parsed JSON on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '1' }),
    });

    const result = await clientApiFetch<{ id: string }>('/test');
    expect(result).toEqual({ id: '1' });
  });

  it('returns undefined on 204 without calling res.json()', async () => {
    const json = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json,
    });

    const result = await clientApiFetch<void>('/test');
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('throws ApiClientError on non-ok response with JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ message: 'Token expired', statusCode: 401 }),
    });

    await expect(clientApiFetch('/protected')).rejects.toThrow(ApiClientError);
    await expect(clientApiFetch('/protected')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('joins array error messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () =>
        Promise.resolve({ message: ['field is required', 'email is invalid'], statusCode: 400 }),
    });

    await expect(clientApiFetch('/data')).rejects.toThrow('field is required, email is invalid');
  });

  it('falls back to statusText when error body is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
    });

    await expect(clientApiFetch('/proxy')).rejects.toMatchObject({
      statusCode: 502,
      message: 'Bad Gateway',
    });
  });

  it('includes Authorization header when session has accessToken', async () => {
    mockGetSession.mockResolvedValueOnce({ accessToken: 'tok-abc' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await clientApiFetch('/me');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    );
  });

  it('serializes body as JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await clientApiFetch('/resource', { method: 'POST', body: { key: 'value' } });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ key: 'value' }) }),
    );
  });
});

describe('clientApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });

  it('calls GET method', async () => {
    await clientApiClient.get('/items');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('calls POST method with body', async () => {
    await clientApiClient.post('/items', { name: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) }),
    );
  });

  it('calls PATCH method with body', async () => {
    await clientApiClient.patch('/items/1', { name: 'updated' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('calls DELETE method and returns undefined on 204', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: vi.fn() });
    const result = await clientApiClient.delete('/items/1');
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
