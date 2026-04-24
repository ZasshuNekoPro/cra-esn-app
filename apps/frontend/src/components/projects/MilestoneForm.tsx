'use client';

import { useState } from 'react';
import type { Milestone, UpdateMilestoneRequest } from '@esn/shared-types';
import { clientProjectsApi } from '../../lib/api/clientProjects';

interface MilestoneFormProps {
  projectId: string;
  existingMilestone?: Milestone;
  onSuccess: (milestone: Milestone) => void;
  onCancel: () => void;
}

export function MilestoneForm({ projectId, existingMilestone, onSuccess, onCancel }: MilestoneFormProps): JSX.Element {
  const [title, setTitle] = useState(existingMilestone?.title ?? '');
  const [description, setDescription] = useState(existingMilestone?.description ?? '');
  const [dueDate, setDueDate] = useState(
    existingMilestone?.dueDate
      ? (typeof existingMilestone.dueDate === 'string'
          ? existingMilestone.dueDate
          : new Date(existingMilestone.dueDate).toISOString()
        ).slice(0, 10)
      : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!existingMilestone;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let milestone: Milestone;
      if (isEdit) {
        const body: UpdateMilestoneRequest = {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
        };
        milestone = await clientProjectsApi.updateMilestone(projectId, existingMilestone.id, body);
      } else {
        milestone = await clientProjectsApi.createMilestone(projectId, {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
        });
      }
      onSuccess(milestone);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titre <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Livraison v1.0"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Détails du jalon..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date d'échéance <span className="text-gray-400">(optionnel)</span>
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter le jalon'}
        </button>
      </div>
    </form>
  );
}
