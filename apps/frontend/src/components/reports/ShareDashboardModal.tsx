'use client';

import { useState } from 'react';
import { reportsApi } from '../../lib/api/reports';
import type { DashboardShareResponse } from '@esn/shared-types';

interface Props {
  onClose: () => void;
}

export function ShareDashboardModal({ onClose }: Props): JSX.Element {
  const [ttlHours, setTtlHours] = useState(48);
  const [result, setResult] = useState<DashboardShareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const share = await reportsApi.createDashboardShare({ ttlHours });
      setResult(share);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du lien');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
    }
  };

  const handleRevoke = async (): Promise<void> => {
    if (!result) return;
    setLoading(true);
    try {
      await reportsApi.revokeDashboardShare(result.token);
      setResult(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la révocation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Partager mon tableau de bord</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Génère un lien temporaire donnant accès à une vue publique de ton tableau de bord
              (données filtrées — sans soldes de congés ni notes privées).
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Durée de validité
              </label>
              <select
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
                <option value={72}>72 heures</option>
                <option value={168}>1 semaine</option>
              </select>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Génération…' : 'Générer le lien'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              Lien valide jusqu'au{' '}
              <strong>{new Date(result.expiresAt).toLocaleString('fr-FR')}</strong>
            </p>

            <div className="mb-4 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="flex-1 truncate text-sm text-gray-700 font-mono">{result.shareUrl}</span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => void handleRevoke()}
                disabled={loading}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
              >
                Révoquer le lien
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
