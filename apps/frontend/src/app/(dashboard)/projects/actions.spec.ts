import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherState } from '@esn/shared-types';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath }));

const createWeatherEntry = vi.fn();
const getWeatherHistory = vi.fn();
vi.mock('../../../lib/api/projects', () => ({
  projectsApi: { createWeatherEntry, getWeatherHistory },
}));

// Import after mocks are set up
const { createWeatherEntryAction, loadWeatherHistoryAction } = await import('./actions');

const STUB_ENTRY = {
  id: 'entry-1',
  projectId: 'proj-1',
  weather: 'SUNNY',
  comment: null,
  date: '2026-04-01',
  createdAt: '2026-04-01T00:00:00.000Z',
};

describe('createWeatherEntryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the created entry and revalidates the project path', async () => {
    createWeatherEntry.mockResolvedValueOnce(STUB_ENTRY);

    const result = await createWeatherEntryAction('proj-1', {
      state: WeatherState.SUNNY,
      date: '2026-04-01',
    });

    expect(result).toEqual(STUB_ENTRY);
    expect(revalidatePath).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith('/projects/proj-1');
  });

  it('does not call revalidatePath when the API throws', async () => {
    createWeatherEntry.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      createWeatherEntryAction('proj-1', { state: WeatherState.SUNNY, date: '2026-04-01' }),
    ).rejects.toThrow('Network error');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('loadWeatherHistoryAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to projectsApi.getWeatherHistory and returns its result', async () => {
    const entries = [STUB_ENTRY];
    getWeatherHistory.mockResolvedValueOnce(entries);

    const result = await loadWeatherHistoryAction('proj-1', '2026-04');

    expect(getWeatherHistory).toHaveBeenCalledWith('proj-1', '2026-04');
    expect(result).toEqual(entries);
  });
});
