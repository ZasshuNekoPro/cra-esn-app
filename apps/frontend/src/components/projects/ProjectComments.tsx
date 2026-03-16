'use client';

import { useState } from 'react';
import { CommentVisibility } from '@esn/shared-types';
import type { ProjectComment } from '@esn/shared-types';
import { CommentCard } from './CommentCard';
import { projectsApi } from '../../lib/api/projects';

interface ProjectCommentsProps {
  projectId: string;
  initialComments: ProjectComment[];
  canResolveBlockers?: boolean;
}

export function ProjectComments({
  projectId,
  initialComments,
  canResolveBlockers = false,
}: ProjectCommentsProps): JSX.Element {
  const [comments, setComments] = useState<ProjectComment[]>(initialComments);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<CommentVisibility>(CommentVisibility.ALL);
  const [isBlocker, setIsBlocker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newComment = await projectsApi.createComment(projectId, {
        content: content.trim(),
        visibility,
        isBlocker,
      });
      setComments((prev) => [newComment, ...prev]);
      setContent('');
      setIsBlocker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolved = (updated: ProjectComment): void => {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="space-y-4">
      {/* Add comment form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Ajouter un commentaire..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Visibilité :</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as CommentVisibility)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={CommentVisibility.ALL}>Tous</option>
              <option value={CommentVisibility.EMPLOYEE_ESN}>ESN seulement</option>
              <option value={CommentVisibility.EMPLOYEE_CLIENT}>Client seulement</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isBlocker}
              onChange={(e) => setIsBlocker(e.target.checked)}
              className="rounded"
            />
            Point bloquant
          </label>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="ml-auto px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '...' : 'Publier'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Aucun commentaire pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              projectId={projectId}
              canResolve={canResolveBlockers}
              onResolved={handleResolved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
