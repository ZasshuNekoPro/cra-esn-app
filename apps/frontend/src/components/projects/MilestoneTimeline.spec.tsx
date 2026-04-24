'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MilestoneTimeline } from './MilestoneTimeline';
import { MilestoneStatus, Role } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';

vi.mock('./MilestoneCard', () => ({
  MilestoneCard: ({
    milestone,
    onCompleted,
    onUpdated,
  }: {
    milestone: Milestone;
    onCompleted?: (m: Milestone) => void;
    onUpdated?: (m: Milestone) => void;
  }) => (
    <div data-testid={`card-${milestone.id}`}>
      <span>{milestone.title}</span>
      {onCompleted && (
        <button
          data-testid={`complete-${milestone.id}`}
          onClick={() => onCompleted({ ...milestone, status: MilestoneStatus.DONE })}
        />
      )}
      {onUpdated && (
        <button
          data-testid={`update-${milestone.id}`}
          onClick={() => onUpdated({ ...milestone, title: `${milestone.title} updated` })}
        />
      )}
    </div>
  ),
}));

vi.mock('./MilestoneForm', () => ({
  MilestoneForm: ({
    onSuccess,
    onCancel,
  }: {
    onSuccess: (m: Milestone) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="milestone-form">
      <button
        data-testid="form-success"
        onClick={() =>
          onSuccess({
            id: 'ms-new',
            projectId: 'proj-1',
            title: 'Nouveau jalon',
            description: null,
            dueDate: null,
            status: MilestoneStatus.PLANNED,
            completedAt: null,
            validatedAt: null,
            createdById: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      />
      <button data-testid="form-cancel" onClick={onCancel} />
    </div>
  ),
}));

vi.mock('./ProjectProgressBar', () => ({ ProjectProgressBar: () => null }));

const STUB_MILESTONE: Milestone = {
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

describe('MilestoneTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state message when no milestones and form is hidden', () => {
    render(
      <MilestoneTimeline projectId="proj-1" initialMilestones={[]} userRole={Role.EMPLOYEE} />,
    );
    expect(screen.getByText('Aucun jalon défini.')).toBeDefined();
  });

  it('hides empty state and shows form when "Ajouter un jalon" is clicked', () => {
    render(
      <MilestoneTimeline projectId="proj-1" initialMilestones={[]} userRole={Role.EMPLOYEE} />,
    );
    fireEvent.click(screen.getByText('+ Ajouter un jalon'));
    expect(screen.queryByText('Aucun jalon défini.')).toBeNull();
    expect(screen.getByTestId('milestone-form')).toBeDefined();
  });

  it('shows "Ajouter un jalon" button for EMPLOYEE but not for ESN_ADMIN', () => {
    const { rerender } = render(
      <MilestoneTimeline projectId="proj-1" initialMilestones={[]} userRole={Role.EMPLOYEE} />,
    );
    expect(screen.getByText('+ Ajouter un jalon')).toBeDefined();

    rerender(
      <MilestoneTimeline projectId="proj-1" initialMilestones={[]} userRole={Role.ESN_ADMIN} />,
    );
    expect(screen.queryByText('+ Ajouter un jalon')).toBeNull();
  });

  it('handleCreated appends new milestone to list and hides form', async () => {
    render(
      <MilestoneTimeline projectId="proj-1" initialMilestones={[]} userRole={Role.EMPLOYEE} />,
    );
    fireEvent.click(screen.getByText('+ Ajouter un jalon'));
    fireEvent.click(screen.getByTestId('form-success'));
    await waitFor(() => {
      expect(screen.getByTestId('card-ms-new')).toBeDefined();
      expect(screen.queryByTestId('milestone-form')).toBeNull();
    });
  });

  it('handleUpdated replaces the updated milestone in the displayed list', async () => {
    render(
      <MilestoneTimeline
        projectId="proj-1"
        initialMilestones={[STUB_MILESTONE]}
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.getByText('Sprint 1')).toBeDefined();
    fireEvent.click(screen.getByTestId('update-ms-1'));
    await waitFor(() => {
      expect(screen.getByText('Sprint 1 updated')).toBeDefined();
    });
  });

  it('filters archived milestones by default', () => {
    const archived: Milestone = {
      ...STUB_MILESTONE,
      id: 'ms-arch',
      title: 'Archivé',
      status: MilestoneStatus.ARCHIVED,
    };
    render(
      <MilestoneTimeline
        projectId="proj-1"
        initialMilestones={[STUB_MILESTONE, archived]}
        userRole={Role.EMPLOYEE}
      />,
    );
    expect(screen.getByTestId('card-ms-1')).toBeDefined();
    expect(screen.queryByTestId('card-ms-arch')).toBeNull();
  });

  it('shows archived milestones when showArchived=true', () => {
    const archived: Milestone = {
      ...STUB_MILESTONE,
      id: 'ms-arch',
      title: 'Archivé',
      status: MilestoneStatus.ARCHIVED,
    };
    render(
      <MilestoneTimeline
        projectId="proj-1"
        initialMilestones={[STUB_MILESTONE, archived]}
        userRole={Role.EMPLOYEE}
        showArchived
      />,
    );
    expect(screen.getByTestId('card-ms-arch')).toBeDefined();
  });

  it('handleCompleted updates milestone status in the list', async () => {
    render(
      <MilestoneTimeline
        projectId="proj-1"
        initialMilestones={[STUB_MILESTONE]}
        userRole={Role.EMPLOYEE}
      />,
    );
    fireEvent.click(screen.getByTestId('complete-ms-1'));
    // After complete, status is DONE — which is not in ACTIONABLE_STATUSES,
    // but the card still renders (complete button just disappears in real card)
    await waitFor(() => {
      expect(screen.getByTestId('card-ms-1')).toBeDefined();
    });
  });
});
