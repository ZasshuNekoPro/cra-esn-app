'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApiFetch } from '../../../../lib/api/clientFetch';
import { ApiClientError } from '../../../../lib/api/client';
import type { Mission } from '../../../../lib/api/missions';
import type { CreateProjectRequest } from '@esn/shared-types';

interface Props {
  missions: Mission[];
}

export function NewProjectForm({ missions }: Props): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<CreateProjectRequest>({
    name: '',
    missionId: '',
    startDate: new Date().toISOString().split('T')[0] ?? '',
    description: '',
    endDate: '',
    estimatedDays: undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: CreateProjectRequest = {
        name: form.name,
        missionId: form.missionId,
        startDate: form.startDate,
        ...(form.description ? { description: form.description } : {}),
        ...(form.endDate ? { endDate: form.endDate } : {}),
        ...(form.estimatedDays ? { estimatedDays: form.estimatedDays } : {}),
      };
      const created = await clientApiFetch<{ id: string }>('/projects', { method: 'POST', body });
      router.push(`/projects/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
      className="bg-white rounded-lg shadow-sm border p-6 space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mission <span className="text-red-500">*</span>
        </label>
        {missions.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
            Aucune mission active. Un projet doit être lié à une mission active.
          </p>
        ) : (
          <select
            required
            value={form.missionId}
            onChange={(e) => setForm((f) => ({ ...f, missionId: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner une mission --</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du projet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="ex: Refonte du portail client"
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de début <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
          <input
            type="date"
            value={form.endDate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Jours estimés</label>
        <input
          type="number"
          min={1}
          value={form.estimatedDays ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, estimatedDays: e.target.value ? Number(e.target.value) : undefined }))}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting || missions.length === 0}
          className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Création...' : 'Créer le projet'}
        </button>
      </div>
    </form>
  );
}
