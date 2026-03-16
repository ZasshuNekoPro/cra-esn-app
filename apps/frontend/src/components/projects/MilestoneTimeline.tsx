'use client';

import { useState } from 'react';
import { MilestoneStatus, Role } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';
import { MilestoneCard } from './MilestoneCard';
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

  const handleCompleted = (updated: Milestone): void => {
    setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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
      {visible.length === 0 ? (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
