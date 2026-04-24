'use client';

import { useState } from 'react';
import { MilestoneStatus, Role } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';
import { clientProjectsApi } from '../../lib/api/clientProjects';
import { MilestoneForm } from './MilestoneForm';

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; class: string }> = {
  [MilestoneStatus.PLANNED]:     { label: 'Planifié',   class: 'bg-blue-100 text-blue-700' },
  [MilestoneStatus.IN_PROGRESS]: { label: 'En cours',   class: 'bg-yellow-100 text-yellow-700' },
  [MilestoneStatus.DONE]:        { label: 'Terminé',    class: 'bg-green-100 text-green-700' },
  [MilestoneStatus.LATE]:        { label: 'En retard',  class: 'bg-red-100 text-red-700' },
  [MilestoneStatus.ARCHIVED]:    { label: 'Archivé',    class: 'bg-gray-100 text-gray-500' },
};

const ACTIONABLE_STATUSES: MilestoneStatus[] = [MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS, MilestoneStatus.LATE];

interface MilestoneCardProps {
  milestone: Milestone;
  projectId: string;
  userRole: Role;
  onCompleted?: (updated: Milestone) => void;
  onUpdated?: (updated: Milestone) => void;
}

export function MilestoneCard({ milestone, projectId, userRole, onCompleted, onUpdated }: MilestoneCardProps): JSX.Element {
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const cfg = STATUS_CONFIG[milestone.status];
  const canComplete = userRole === Role.EMPLOYEE && ACTIONABLE_STATUSES.includes(milestone.status);
  const canEdit = userRole === Role.EMPLOYEE && milestone.status !== MilestoneStatus.DONE && milestone.status !== MilestoneStatus.ARCHIVED;

  const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLate = dueDate && milestone.status === MilestoneStatus.LATE
    ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleComplete = async (): Promise<void> => {
    setCompleting(true);
    try {
      const updated = await clientProjectsApi.completeMilestone(projectId, milestone.id, {});
      onCompleted?.(updated);
    } finally {
      setCompleting(false);
    }
  };

  if (editing) {
    return (
      <div className="p-3 bg-white border border-blue-200 rounded-lg">
        <MilestoneForm
          projectId={projectId}
          existingMilestone={milestone}
          onSuccess={(updated) => {
            setEditing(false);
            onUpdated?.(updated);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {dueDate && (
            <span className="text-xs text-gray-500">
              Échéance : {dueDate.toLocaleDateString('fr-FR')}
            </span>
          )}
          {milestone.status === MilestoneStatus.LATE && daysLate > 0 && (
            <span className="text-xs font-medium text-red-600">{daysLate} jour{daysLate > 1 ? 's' : ''} de retard</span>
          )}
          {milestone.status === MilestoneStatus.DONE && milestone.completedAt && (
            <span className="text-xs text-gray-500">
              Terminé le {new Date(milestone.completedAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
          {cfg.label}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Modifier
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={completing}
            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {completing ? '...' : 'Terminer'}
          </button>
        )}
      </div>
    </div>
  );
}
