'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MilestoneForm } from './MilestoneForm';
import { MilestoneStatus } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';

const { mockCreateMilestone, mockUpdateMilestone } = vi.hoisted(() => ({
  mockCreateMilestone: vi.fn(),
  mockUpdateMilestone: vi.fn(),
}));

vi.mock('../../lib/api/clientProjects', () => ({
  clientProjectsApi: {
    createMilestone: mockCreateMilestone,
    updateMilestone: mockUpdateMilestone,
    completeMilestone: vi.fn(),
  },
}));

const STUB_MILESTONE: Milestone = {
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'Livraison v1.0',
  description: 'Détails ici',
  dueDate: new Date('2026-06-30T12:00:00.000Z'),
  status: MilestoneStatus.PLANNED,
  completedAt: null,
  validatedAt: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MilestoneForm — create mode', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Ajouter le jalon" submit button', () => {
    render(<MilestoneForm projectId="proj-1" onSuccess={onSuccess} onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Ajouter le jalon' })).toBeDefined();
  });

  it('shows validation error when title is whitespace-only (bypasses required attr)', async () => {
    const { container } = render(
      <MilestoneForm projectId="proj-1" onSuccess={onSuccess} onCancel={onCancel} />,
    );
    // Type spaces only — HTML5 required passes (value not empty), but our trim check catches it
    fireEvent.change(screen.getByPlaceholderText('Ex : Livraison v1.0'), {
      target: { value: '   ' },
    });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText('Le titre est obligatoire.')).toBeDefined();
    });
    expect(mockCreateMilestone).not.toHaveBeenCalled();
  });

  it('calls createMilestone and onSuccess when submitted with a title', async () => {
    const created: Milestone = { ...STUB_MILESTONE, id: 'ms-new' };
    mockCreateMilestone.mockResolvedValueOnce(created);
    render(<MilestoneForm projectId="proj-1" onSuccess={onSuccess} onCancel={onCancel} />);
    fireEvent.change(screen.getByPlaceholderText('Ex : Livraison v1.0'), {
      target: { value: 'Sprint 1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le jalon' }));
    await waitFor(() => {
      expect(mockCreateMilestone).toHaveBeenCalledWith(
        'proj-1',
        expect.objectContaining({ title: 'Sprint 1' }),
      );
      expect(onSuccess).toHaveBeenCalledWith(created);
    });
  });

  it('calls onCancel when the cancel button is clicked', () => {
    render(<MilestoneForm projectId="proj-1" onSuccess={onSuccess} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(mockCreateMilestone).not.toHaveBeenCalled();
  });
});

describe('MilestoneForm — edit mode', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Enregistrer" submit button and pre-fills title', () => {
    render(
      <MilestoneForm
        projectId="proj-1"
        existingMilestone={STUB_MILESTONE}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDefined();
    const titleInput = screen.getByPlaceholderText('Ex : Livraison v1.0') as HTMLInputElement;
    expect(titleInput.value).toBe('Livraison v1.0');
  });

  it('pre-fills dueDate sliced to YYYY-MM-DD from the milestone Date object', () => {
    render(
      <MilestoneForm
        projectId="proj-1"
        existingMilestone={STUB_MILESTONE}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />,
    );
    const dueDateInput = screen.getByDisplayValue('2026-06-30') as HTMLInputElement;
    expect(dueDateInput.type).toBe('date');
  });

  it('calls updateMilestone with edited title and calls onSuccess', async () => {
    const updated: Milestone = { ...STUB_MILESTONE, title: 'Livraison v2.0' };
    mockUpdateMilestone.mockResolvedValueOnce(updated);
    render(
      <MilestoneForm
        projectId="proj-1"
        existingMilestone={STUB_MILESTONE}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Ex : Livraison v1.0'), {
      target: { value: 'Livraison v2.0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => {
      expect(mockUpdateMilestone).toHaveBeenCalledWith(
        'proj-1',
        'ms-1',
        expect.objectContaining({ title: 'Livraison v2.0' }),
      );
      expect(onSuccess).toHaveBeenCalledWith(updated);
    });
  });
});
