import { describe, it, expect, vi } from 'vitest';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath }));

const { revalidateCraAction } = await import('./actions');

describe('revalidateCraAction', () => {
  it('revalidates the correct CRA path for the given year and month', async () => {
    await revalidateCraAction(2026, 4);
    expect(revalidatePath).toHaveBeenCalledWith('/cra/2026/4');
  });

  it('works for different year/month combinations', async () => {
    await revalidateCraAction(2025, 12);
    expect(revalidatePath).toHaveBeenCalledWith('/cra/2025/12');
  });
});
