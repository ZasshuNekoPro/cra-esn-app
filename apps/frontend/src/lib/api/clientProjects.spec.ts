import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role } from '@esn/shared-types';

const { mockClientApiFetch } = vi.hoisted(() => ({
  mockClientApiFetch: vi.fn(),
}));

vi.mock('./clientFetch', () => ({
  clientApiFetch: mockClientApiFetch,
  clientApiClient: {
    get: <T>(path: string): Promise<T> => mockClientApiFetch(path, { method: 'GET' }) as Promise<T>,
    post: <T>(path: string, body?: unknown): Promise<T> => mockClientApiFetch(path, { method: 'POST', body }) as Promise<T>,
    patch: <T>(path: string, body?: unknown): Promise<T> => mockClientApiFetch(path, { method: 'PATCH', body }) as Promise<T>,
    delete: <T>(path: string): Promise<T> => mockClientApiFetch(path, { method: 'DELETE' }) as Promise<T>,
  },
}));

import { clientProjectsApi } from './clientProjects';

describe('clientProjectsApi — validation methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientApiFetch.mockResolvedValue({});
  });

  it('createValidation POSTs to /projects/:id/validations', async () => {
    await clientProjectsApi.createValidation('proj-1', {
      title: 'Revue sprint',
      description: 'desc',
      targetRole: Role.ESN_ADMIN,
    });

    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/projects/proj-1/validations',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('approveValidation POSTs to /projects/:id/validations/:validationId/approve', async () => {
    await clientProjectsApi.approveValidation('proj-1', 'val-1', { decisionComment: 'OK' });

    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/projects/proj-1/validations/val-1/approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejectValidation POSTs to /projects/:id/validations/:validationId/reject', async () => {
    await clientProjectsApi.rejectValidation('proj-1', 'val-1', {});

    expect(mockClientApiFetch).toHaveBeenCalledWith(
      '/projects/proj-1/validations/val-1/reject',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
