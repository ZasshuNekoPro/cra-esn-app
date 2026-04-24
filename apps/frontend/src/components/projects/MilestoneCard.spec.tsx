'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneStatus, Role } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';

const { mockCompleteMilestone } = vi.hoisted(() => ({
  mockCompleteMilestone: vi.fn(),
}));

vi.mock('../../lib/api/clientProjects', () => ({
  clientProjectsApi: {
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    completeMilestone: mockCompleteMilestone,
  },
}));

vi.mock('./MilestoneForm', () => ({
  MilestoneForm: ({
    existingMilestone,
    onSuccess,
    onCancel,
  }: {
    existingMilestone?: Milestone;
    onSuccess: (m: Milestone) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="milestone-form">
      <button
        data-testid="form-success"
        onClick={() =>
          onSuccess({ ...existingMilestone!, title: `${existingMilestone?.title ?? ''} updated` })
        }
      />
      <button data-testid="form-cancel" onClick={onCancel} />
    </div>
  ),
}));

const STUB_PLANNED: Milestone = {
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'Sprint 1',
  description: null,
  dueDate: null,
  status: MilestoneStatus.PLANNED,
  completedAt: null,
  validatedAt: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MilestoneCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and status badge', () => {
    render(<MilestoneCard milestone={STUB_PLANNED} projectId="proj-1" userRole={Role.EMPLOYEE} />);
    expect(screen.getByText('Sprint 1')).toBeDefined();
    expect(screen.getByText('Planifié')).toBeDefined();
  });

  it('shows "Terminer" and "Modifier" for EMPLOYEE + PLANNED', () => {
    render(<MilestoneCard milestone={STUB_PLANNED} projectId="proj-1" userRole={Role.EMPLOYEE} />);
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeDefined();
  });

  it('hides "Terminer" and "Modifier" for ESN_ADMIN', () => {
    render(<MilestoneCard milestone={STUB_PLANNED} projectId="proj-1" userRole={Role.ESN_ADMIN} />);
    expect(screen.queryByRole('button', { name: 'Terminer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
  });

  it('hides both action buttons for DONE milestone', () => {
    render(
      <MilestoneCard
        milestone={{ ...STUB_PLANNED, status: MilestoneStatus.DONE }}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Terminer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
  });

  it('hides both action buttons for ARCHIVED milestone', () => {
    render(
      <MilestoneCard
        milestone={{ ...STUB_PLANNED, status: MilestoneStatus.ARCHIVED }}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Terminer' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
  });

  it('shows "Terminer" for IN_PROGRESS and LATE milestones', () => {
    const { rerender } = render(
      <MilestoneCard
        milestone={{ ...STUB_PLANNED, status: MilestoneStatus.IN_PROGRESS }}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDefined();

    rerender(
      <MilestoneCard
        milestone={{ ...STUB_PLANNED, status: MilestoneStatus.LATE }}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDefined();
  });

  it('calls completeMilestone and fires onCompleted when "Terminer" clicked', async () => {
    const completed: Milestone = { ...STUB_PLANNED, status: MilestoneStatus.DONE };
    mockCompleteMilestone.mockResolvedValueOnce(completed);
    const onCompleted = vi.fn();
    render(
      <MilestoneCard
        milestone={STUB_PLANNED}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
        onCompleted={onCompleted}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    await waitFor(() => {
      expect(mockCompleteMilestone).toHaveBeenCalledWith('proj-1', 'ms-1', {});
      expect(onCompleted).toHaveBeenCalledWith(completed);
    });
  });

  it('renders inline MilestoneForm when "Modifier" clicked, fires onUpdated on success', async () => {
    const onUpdated = vi.fn();
    render(
      <MilestoneCard
        milestone={STUB_PLANNED}
        projectId="proj-1"
        userRole={Role.EMPLOYEE}
        onUpdated={onUpdated}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByTestId('milestone-form')).toBeDefined();

    fireEvent.click(screen.getByTestId('form-success'));
    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sprint 1 updated' }),
      );
    });
  });

  it('hides inline form when MilestoneForm cancel is triggered', () => {
    render(
      <MilestoneCard milestone={STUB_PLANNED} projectId="proj-1" userRole={Role.EMPLOYEE} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByTestId('milestone-form')).toBeDefined();

    fireEvent.click(screen.getByTestId('form-cancel'));
    expect(screen.queryByTestId('milestone-form')).toBeNull();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeDefined();
  });
});
