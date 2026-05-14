import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherState, CommentVisibility } from '@esn/shared-types';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath }));

const createWeatherEntry = vi.fn();
const getWeatherHistory = vi.fn();
const createComment = vi.fn();
const resolveBlocker = vi.fn();
vi.mock('../../../lib/api/projects', () => ({
  projectsApi: { createWeatherEntry, getWeatherHistory, createComment, resolveBlocker },
}));

// Import after mocks are set up
const { createWeatherEntryAction, loadWeatherHistoryAction, createCommentAction, resolveBlockerAction } = await import('./actions');

const STUB_ENTRY = {
  id: 'entry-1',
  projectId: 'proj-1',
  state: WeatherState.SUNNY,
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

const STUB_COMMENT = {
  id: 'comment-1',
  projectId: 'proj-1',
  content: 'Un commentaire',
  visibility: CommentVisibility.ALL,
  isBlocker: false,
  resolvedAt: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  authorId: 'user-1',
};

describe('createCommentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the created comment and revalidates the project path', async () => {
    createComment.mockResolvedValueOnce(STUB_COMMENT);

    const result = await createCommentAction('proj-1', {
      content: 'Un commentaire',
      visibility: CommentVisibility.ALL,
      isBlocker: false,
    });

    expect(createComment).toHaveBeenCalledWith('proj-1', expect.objectContaining({ content: 'Un commentaire' }));
    expect(result).toEqual(STUB_COMMENT);
    expect(revalidatePath).toHaveBeenCalledWith('/projects/proj-1');
  });

  it('does not call revalidatePath when the API throws', async () => {
    createComment.mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(
      createCommentAction('proj-1', { content: 'X', visibility: CommentVisibility.ALL, isBlocker: false }),
    ).rejects.toThrow('Unauthorized');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('resolveBlockerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved comment and revalidates the project path', async () => {
    const resolved = { ...STUB_COMMENT, resolvedAt: '2026-04-02T00:00:00.000Z' };
    resolveBlocker.mockResolvedValueOnce(resolved);

    const result = await resolveBlockerAction('proj-1', 'comment-1');

    expect(resolveBlocker).toHaveBeenCalledWith('proj-1', 'comment-1');
    expect(result).toEqual(resolved);
    expect(revalidatePath).toHaveBeenCalledWith('/projects/proj-1');
  });

  it('does not call revalidatePath when the API throws', async () => {
    resolveBlocker.mockRejectedValueOnce(new Error('Not found'));

    await expect(resolveBlockerAction('proj-1', 'comment-1')).rejects.toThrow('Not found');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
