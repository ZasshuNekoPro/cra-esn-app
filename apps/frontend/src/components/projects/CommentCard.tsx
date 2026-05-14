'use client';

import { useState } from 'react';
import { CommentVisibility } from '@esn/shared-types';
import type { ProjectComment } from '@esn/shared-types';
import { resolveBlockerAction } from '../../app/(dashboard)/projects/actions';

const VISIBILITY_CONFIG: Record<CommentVisibility, { label: string; class: string }> = {
  [CommentVisibility.ALL]: { label: 'Tous', class: 'bg-blue-100 text-blue-700' },
  [CommentVisibility.EMPLOYEE_ESN]: { label: 'ESN', class: 'bg-purple-100 text-purple-700' },
  [CommentVisibility.EMPLOYEE_CLIENT]: { label: 'Client', class: 'bg-teal-100 text-teal-700' },
};

interface CommentCardProps {
  comment: ProjectComment;
  projectId: string;
  canResolve?: boolean;
  onResolved?: (updated: ProjectComment) => void;
}

export function CommentCard({ comment, projectId, canResolve = false, onResolved }: CommentCardProps): JSX.Element {
  const [resolving, setResolving] = useState(false);
  const visConfig = VISIBILITY_CONFIG[comment.visibility];
  const isResolved = Boolean(comment.resolvedAt);

  const handleResolve = async (): Promise<void> => {
    setResolving(true);
    try {
      const updated = await resolveBlockerAction(projectId, comment.id);
      onResolved?.(updated);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className={[
      'p-4 bg-white border rounded-lg',
      comment.isBlocker && !isResolved ? 'border-red-200 bg-red-50' : 'border-gray-200',
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{comment.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visConfig.class}`}>
              {visConfig.label}
            </span>
            {comment.isBlocker && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isResolved ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                {isResolved ? 'Bloquant — résolu' : 'Bloquant'}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        {comment.isBlocker && !isResolved && canResolve && (
          <button
            type="button"
            onClick={() => void handleResolve()}
            disabled={resolving}
            className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
          >
            {resolving ? '...' : 'Résoudre'}
          </button>
        )}
      </div>
    </div>
  );
}
