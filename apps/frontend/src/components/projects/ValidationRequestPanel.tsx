'use client';

import { useState, useRef } from 'react';
import { ValidationStatus, Role } from '@esn/shared-types';
import type { ProjectValidationRequest } from '@esn/shared-types';
import { clientProjectsApi } from '../../lib/api/clientProjects';

const STATUS_CONFIG: Record<ValidationStatus, { label: string; class: string }> = {
  [ValidationStatus.PENDING]:  { label: 'En attente', class: 'bg-orange-100 text-orange-700' },
  [ValidationStatus.APPROVED]: { label: 'Approuvé',   class: 'bg-green-100 text-green-700' },
  [ValidationStatus.REJECTED]: { label: 'Refusé',     class: 'bg-red-100 text-red-700' },
  [ValidationStatus.ARCHIVED]: { label: 'Archivé',    class: 'bg-gray-100 text-gray-500' },
};

interface ValidationRequestPanelProps {
  projectId: string;
  initialValidations: ProjectValidationRequest[];
  userRole: Role;
}

export function ValidationRequestPanel({
  projectId,
  initialValidations,
  userRole,
}: ValidationRequestPanelProps): JSX.Element {
  const [validations, setValidations] = useState<ProjectValidationRequest[]>(initialValidations);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState<Role>(Role.ESN_ADMIN);
  const [decisionComments, setDecisionComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await clientProjectsApi.createValidation(projectId, { title, description, targetRole });
      setValidations((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecide = async (validationId: string, action: 'approve' | 'reject'): Promise<void> => {
    const key = validationId + action;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setDeciding(key);
    setError(null);
    try {
      const comment = decisionComments[validationId] ?? '';
      const updated = action === 'approve'
        ? await clientProjectsApi.approveValidation(projectId, validationId, { decisionComment: comment || undefined })
        : await clientProjectsApi.rejectValidation(projectId, validationId, { decisionComment: comment || undefined });
      setValidations((prev) => prev.map((v) => (v.id === validationId ? updated : v)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      inFlight.current.delete(key);
      setDeciding(null);
    }
  };

  const canDecide = (v: ProjectValidationRequest): boolean =>
    v.status === ValidationStatus.PENDING &&
    ((v.targetRole === Role.ESN_ADMIN && (userRole === Role.ESN_ADMIN || userRole === Role.ESN_MANAGER)) ||
      (v.targetRole === Role.CLIENT && userRole === Role.CLIENT));

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      )}
      {/* Create form toggle */}
      {userRole === Role.EMPLOYEE && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          + Créer une demande de validation
        </button>
      )}

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Nouvelle demande de validation</h3>
          <div>
            <label htmlFor="val-title" className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
            <input
              id="val-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="val-description" className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              id="val-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="val-target-role" className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
            <select
              id="val-target-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as Role)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={Role.ESN_ADMIN}>ESN</option>
              <option value={Role.CLIENT}>Client</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:underline">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '...' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}

      {/* Validation list */}
      {validations.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune demande de validation.</p>
      ) : (
        <div className="space-y-3">
          {validations.map((v) => {
            const cfg = STATUS_CONFIG[v.status];
            return (
              <div key={v.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{v.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{v.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        → {v.targetRole === Role.ESN_ADMIN ? 'ESN' : 'Client'}
                      </span>
                    </div>
                    {v.decisionComment && (
                      <p className="text-xs text-gray-600 mt-1 italic">« {v.decisionComment} »</p>
                    )}
                  </div>
                </div>
                {canDecide(v) && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Commentaire de décision (optionnel)"
                      value={decisionComments[v.id] ?? ''}
                      onChange={(e) => setDecisionComments((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={deciding !== null}
                        onClick={() => void handleDecide(v.id, 'approve')}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {deciding === v.id + 'approve' ? '...' : 'Approuver'}
                      </button>
                      <button
                        type="button"
                        disabled={deciding !== null}
                        onClick={() => void handleDecide(v.id, 'reject')}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {deciding === v.id + 'reject' ? '...' : 'Refuser'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
