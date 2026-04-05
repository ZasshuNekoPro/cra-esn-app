'use client';

import { useState, useEffect } from 'react';
import { esnClientApi } from '../../../../../lib/api/esn';
import { ApiClientError } from '../../../../../lib/api/client';
import type { Esn } from '@esn/shared-types';

export default function PlatformEsnPage(): JSX.Element {
  const [esns, setEsns] = useState<Esn[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({ name: '', siret: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEsns = async (): Promise<void> => {
    try {
      const data = await esnClientApi.list();
      setEsns(data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadEsns();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await esnClientApi.create({
        name: form.name,
        siret: form.siret || undefined,
        address: form.address || undefined,
      });
      setEsns((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', siret: '', address: '' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Entreprises ESN</h1>
        <p className="text-sm text-gray-500">Gestion des ESN enregistrées sur la plateforme.</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Enregistrer une nouvelle ESN</h2>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l&apos;ESN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex : Sopra Steria"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SIRET (optionnel)</label>
              <input
                type="text"
                value={form.siret}
                onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
                placeholder="14 chiffres"
                maxLength={14}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (optionnel)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Ex : 10 rue de la Paix, Paris"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer l\'ESN'}
          </button>
        </form>
      </div>

      {/* ESN list */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">ESN enregistrées ({esns.length})</h2>
        </div>
        {loadingList ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : esns.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Aucune ESN enregistrée pour le moment.
          </div>
        ) : (
          <ul className="divide-y">
            {esns.map((esn) => (
              <li key={esn.id} className="px-6 py-4">
                <p className="font-medium text-gray-900">{esn.name}</p>
                <div className="flex gap-4 text-xs text-gray-400 mt-1">
                  {esn.siret && <span>SIRET : {esn.siret}</span>}
                  {esn.address && <span>{esn.address}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
