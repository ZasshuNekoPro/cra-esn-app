'use client';

import { useState } from 'react';
import { consentApi } from '../../lib/api/consent';

const SCOPE_OPTIONS = [
  { value: 'cra', label: 'CRA (feuilles de temps)' },
  { value: 'projects', label: 'Projets' },
  { value: 'documents', label: 'Documents' },
];

export function RequestConsentForm() {
  const [employeeId, setEmployeeId] = useState('');
  const [scope, setScope] = useState<string[]>(['cra']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleScope(value: string) {
    setScope((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || scope.length === 0) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await consentApi.request(employeeId.trim(), scope);
      setSuccess(true);
      setEmployeeId('');
      setScope(['cra']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          ID du salarié (UUID)
        </label>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <p className="block text-xs font-medium text-gray-700 mb-1">Périmètre demandé</p>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={scope.includes(opt.value)}
                onChange={() => toggleScope(opt.value)}
                className="rounded"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">Demande envoyée avec succès.</p>}

      <button
        type="submit"
        disabled={loading || !employeeId.trim() || scope.length === 0}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </form>
  );
}
