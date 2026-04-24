'use client';

import { useState } from 'react';
import { MilestoneStatus, Role } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneForm } from './MilestoneForm';
import { ProjectProgressBar } from './ProjectProgressBar';

interface MilestoneTimelineProps {
  projectId: string;
  initialMilestones: Milestone[];
  userRole: Role;
  showArchived?: boolean;
}

export function MilestoneTimeline({
  projectId,
  initialMilestones,
  userRole,
  showArchived = false,
}: MilestoneTimelineProps): JSX.Element {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [showForm, setShowForm] = useState(false);

  const handleCompleted = (updated: Milestone): void => {
    setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleUpdated = (updated: Milestone): void => {
    setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleCreated = (created: Milestone): void => {
    setMilestones((prev) => [...prev, created]);
    setShowForm(false);
  };

  const visible = milestones
    .filter((m) => showArchived || m.status !== MilestoneStatus.ARCHIVED)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="space-y-4">
      {milestones.length > 0 && (
        <ProjectProgressBar milestones={milestones} />
      )}
      {visible.length === 0 && !showForm ? (
        <p className="text-sm text-gray-500">Aucun jalon défini.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              projectId={projectId}
              userRole={userRole}
              onCompleted={handleCompleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {userRole === Role.EMPLOYEE && (
        showForm ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <MilestoneForm
              projectId={projectId}
              onSuccess={handleCreated}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Ajouter un jalon
          </button>
        )
      )}
    </div>
  );
}
