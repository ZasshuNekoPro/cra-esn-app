import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock('../../../../../../auth', () => ({ auth: mockAuth }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import { GET } from './route';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest() {
  return new NextRequest('http://localhost/api/reports/validation/req-1/pdf');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/reports/validation/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when session is missing', async () => {
    mockAuth.mockResolvedValueOnce(null);

    const res = await GET(makeRequest(), { params: { id: 'req-1' } });

    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return 401 when session has no accessToken', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'u1' } });

    const res = await GET(makeRequest(), { params: { id: 'req-1' } });

    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should proxy backend status code on non-ok response', async () => {
    mockAuth.mockResolvedValueOnce({ accessToken: 'tok-abc' });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    const res = await GET(makeRequest(), { params: { id: 'req-1' } });

    expect(res.status).toBe(403);
  });

  it('should stream PDF bytes with correct headers on success', async () => {
    mockAuth.mockResolvedValueOnce({ accessToken: 'tok-abc' });
    const fakeBody = new ReadableStream();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, body: fakeBody });

    const res = await GET(makeRequest(), { params: { id: 'req-1' } });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('rapport.pdf');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reports/validation/req-1/pdf'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-abc' }),
      }),
    );
  });
});
