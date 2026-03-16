import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClientError, apiFetch, apiClient } from './client';

// Mock next-auth so auth() doesn't fail in node env
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClientError', () => {
  it('should set statusCode and message', () => {
    const err = new ApiClientError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiClientError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should call fetch with the correct URL and headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'ok' }),
    });

    await apiFetch('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('should include Authorization header when token is present', async () => {
    const { auth } = await import('../../auth');
    vi.mocked(auth).mockResolvedValueOnce({ accessToken: 'test-token' } as never);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/me');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });

  it('should throw ApiClientError on non-ok response with string message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized', error: 'Unauthorized', statusCode: 401 }),
    });

    await expect(apiFetch('/protected')).rejects.toThrow(ApiClientError);
    await expect(apiFetch('/protected')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('should join array error messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: ['field is required', 'email is invalid'], statusCode: 400 }),
    });

    await expect(apiFetch('/data')).rejects.toThrow('field is required, email is invalid');
  });

  it('should serialize body as JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await apiFetch('/resource', { method: 'POST', body: { key: 'value' } });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ key: 'value' }) }),
    );
  });
});

describe('apiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('should call GET method', async () => {
    await apiClient.get('/items');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('should call POST method with body', async () => {
    await apiClient.post('/items', { name: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'test' }) }),
    );
  });

  it('should call PATCH method with body', async () => {
    await apiClient.patch('/items/1', { name: 'updated' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('should call DELETE method', async () => {
    await apiClient.delete('/items/1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
