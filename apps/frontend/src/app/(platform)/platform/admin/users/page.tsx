'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@esn/shared-types';
import { usersClientApi } from '../../../../../lib/api/users';
import { esnClientApi } from '../../../../../lib/api/esn';
import { ApiClientError } from '../../../../../lib/api/client';
import type { Esn } from '@esn/shared-types';

export default function CreateEsnAdminPage(): JSX.Element {
  const router = useRouter();
  const [esns, setEsns] = useState<Esn[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    esnId: '',
    role: Role.ESN_ADMIN as Role.ESN_ADMIN,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    esnClientApi.list().then(setEsns).catch(() => { /* silently ignore */ });
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await usersClientApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: form.role,
        esnId: form.esnId || undefined,
      });
      router.push('/platform/admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Créer un compte ESN</h1>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe (min. 8 caractères)</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role.ESN_ADMIN }))}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={Role.ESN_ADMIN}>ESN Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ESN associée <span className="text-red-500">*</span>
          </label>
          {esns.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Aucune ESN disponible.{' '}
              <a href="/platform/admin/esn" className="underline">Créer une ESN d&apos;abord →</a>
            </p>
          ) : (
            <select
              required
              value={form.esnId}
              onChange={(e) => setForm((f) => ({ ...f, esnId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sélectionner une ESN —</option>
              {esns.map((esn) => (
                <option key={esn.id} value={esn.id}>{esn.name}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || esns.length === 0}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer le compte ESN'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
