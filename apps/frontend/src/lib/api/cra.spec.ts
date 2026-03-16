import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CraEntryType } from '@esn/shared-types';

// Mock apiClient before importing cra module
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mock is set up
import { craApi } from './cra';
import { apiClient } from './client';

const mockedApiClient = vi.mocked(apiClient);

describe('craApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET /cra/months/:year/:month', async () => {
    const mockMonth = { id: 'month-1', year: 2026, month: 3, status: 'DRAFT' };
    mockedApiClient.get.mockResolvedValueOnce(mockMonth);

    const result = await craApi.getOrCreateMonth(2026, 3);

    expect(mockedApiClient.get).toHaveBeenCalledWith('/cra/months/2026/3');
    expect(result).toEqual(mockMonth);
  });

  it('should call POST /cra/months/:id/entries with correct body', async () => {
    const mockEntry = { id: 'entry-1', date: '2026-03-10', entryType: CraEntryType.WORK_ONSITE, dayFraction: 1.0 };
    mockedApiClient.post.mockResolvedValueOnce(mockEntry);

    const body = { date: '2026-03-10', entryType: CraEntryType.WORK_ONSITE, dayFraction: 1.0 };
    const result = await craApi.createEntry('month-1', body);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/cra/months/month-1/entries', body);
    expect(result).toEqual(mockEntry);
  });

  it('should call PATCH /cra/months/:id/entries/:eid', async () => {
    const mockEntry = { id: 'entry-1', entryType: CraEntryType.WORK_REMOTE, dayFraction: 0.5 };
    mockedApiClient.patch.mockResolvedValueOnce(mockEntry);

    const body = { entryType: CraEntryType.WORK_REMOTE, dayFraction: 0.5 };
    const result = await craApi.updateEntry('month-1', 'entry-1', body);

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/cra/months/month-1/entries/entry-1', body);
    expect(result).toEqual(mockEntry);
  });

  it('should call DELETE /cra/months/:id/entries/:eid', async () => {
    mockedApiClient.delete.mockResolvedValueOnce(undefined);

    await craApi.deleteEntry('month-1', 'entry-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/cra/months/month-1/entries/entry-1');
  });

  it('should call POST /cra/months/:id/submit', async () => {
    const mockMonth = { id: 'month-1', status: 'SUBMITTED' };
    mockedApiClient.post.mockResolvedValueOnce(mockMonth);

    const result = await craApi.submit('month-1');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/cra/months/month-1/submit');
    expect(result).toEqual(mockMonth);
  });

  it('should call POST /cra/months/:id/sign-employee', async () => {
    const mockMonth = { id: 'month-1', status: 'SIGNED_EMPLOYEE' };
    mockedApiClient.post.mockResolvedValueOnce(mockMonth);

    const result = await craApi.signEmployee('month-1');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/cra/months/month-1/sign-employee');
    expect(result).toEqual(mockMonth);
  });
});
