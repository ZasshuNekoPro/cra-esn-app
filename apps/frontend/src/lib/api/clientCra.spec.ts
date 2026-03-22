/**
 * T3 — clientCraApi doit exposer toutes les mutations CRA via clientApiFetch
 * (et non via apiClient server-side).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CraEntryType } from '@esn/shared-types';

const { mockClientApiFetch } = vi.hoisted(() => ({
  mockClientApiFetch: vi.fn(),
}));

// Mock clientFetch — évite de charger next-auth/react dans l'environnement de test
vi.mock('./clientFetch', () => ({
  clientApiFetch: mockClientApiFetch,
  clientApiClient: {
    get: (path: string) => mockClientApiFetch(path, { method: 'GET' }),
    post: (path: string, body?: unknown) => mockClientApiFetch(path, { method: 'POST', body }),
    patch: (path: string, body?: unknown) => mockClientApiFetch(path, { method: 'PATCH', body }),
    delete: (path: string) => mockClientApiFetch(path, { method: 'DELETE' }),
  },
}));

import { clientCraApi } from './clientCra';

describe('clientCraApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientApiFetch.mockResolvedValue({});
  });

  it('createEntry calls POST /cra/months/:id/entries', async () => {
    const body = { date: '2026-03-05', entryType: CraEntryType.WORK_ONSITE, dayFraction: 1 };
    await clientCraApi.createEntry('m1', body);
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/entries',
      expect.objectContaining({ method: 'POST', body }),
    );
  });

  it('updateEntry calls PATCH /cra/months/:id/entries/:eid', async () => {
    const body = { entryType: CraEntryType.WORK_REMOTE, dayFraction: 0.5 };
    await clientCraApi.updateEntry('m1', 'e1', body);
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/entries/e1',
      expect.objectContaining({ method: 'PATCH', body }),
    );
  });

  it('deleteEntry calls DELETE /cra/months/:id/entries/:eid', async () => {
    await clientCraApi.deleteEntry('m1', 'e1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/entries/e1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('submit calls POST /cra/months/:id/submit', async () => {
    await clientCraApi.submit('m1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/submit',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('retract calls POST /cra/months/:id/retract', async () => {
    await clientCraApi.retract('m1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/retract',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('signEmployee calls POST /cra/months/:id/sign-employee', async () => {
    await clientCraApi.signEmployee('m1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/sign-employee',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('signEsn calls POST /cra/months/:id/sign-esn', async () => {
    await clientCraApi.signEsn('m1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/sign-esn',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejectEsn calls POST /cra/months/:id/reject-esn with comment', async () => {
    await clientCraApi.rejectEsn('m1', 'motif du refus');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/reject-esn',
      expect.objectContaining({ method: 'POST', body: { comment: 'motif du refus' } }),
    );
  });

  it('signClient calls POST /cra/months/:id/sign-client', async () => {
    await clientCraApi.signClient('m1');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/sign-client',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejectClient calls POST /cra/months/:id/reject-client with comment', async () => {
    await clientCraApi.rejectClient('m1', 'autre motif');
    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/cra/months/m1/reject-client',
      expect.objectContaining({ method: 'POST', body: { comment: 'autre motif' } }),
    );
  });
});
