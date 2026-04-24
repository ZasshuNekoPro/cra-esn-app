import { describe, it, expect, vi, beforeEach } from 'vitest';

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath }));

const archiveValidation = vi.fn();
const remindValidation = vi.fn();
vi.mock('../../../../../lib/api/reports', () => ({
  reportsApi: { archiveValidation, remindValidation },
}));

const { archiveValidationAction, remindValidationAction } = await import('./actions');

describe('archiveValidationAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls reportsApi.archiveValidation with the given id and revalidates the admin reports path', async () => {
    archiveValidation.mockResolvedValueOnce(undefined);

    await archiveValidationAction('validation-123');

    expect(archiveValidation).toHaveBeenCalledWith('validation-123');
    expect(revalidatePath).toHaveBeenCalledWith('/esn/admin/reports');
  });

  it('does not call revalidatePath when the API throws', async () => {
    archiveValidation.mockRejectedValueOnce(new Error('Network error'));

    await expect(archiveValidationAction('validation-123')).rejects.toThrow('Network error');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('remindValidationAction', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls reportsApi.remindValidation with the given id and revalidates the admin reports path', async () => {
    remindValidation.mockResolvedValueOnce(undefined);

    await remindValidationAction('validation-456');

    expect(remindValidation).toHaveBeenCalledWith('validation-456');
    expect(revalidatePath).toHaveBeenCalledWith('/esn/admin/reports');
  });

  it('does not call revalidatePath when the API throws', async () => {
    remindValidation.mockRejectedValueOnce(new Error('API error'));

    await expect(remindValidationAction('validation-456')).rejects.toThrow('API error');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});