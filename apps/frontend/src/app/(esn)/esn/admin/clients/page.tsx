'use client';

import { useState, useEffect } from 'react';
import type { PublicUser } from '../../../../../lib/api/users';
import { listClientsAction, createClientAction } from './actions';

export default function AdminClientsPage(): JSX.Element {
  const [clients, setClients] = useState<PublicUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = async (): Promise<void> => {
    try {
      const clients = await listClientsAction();
      setClients(clients);
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { void loadClients(); }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createClientAction({
        ...form,
        phone: form.phone || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
        setShowForm(false);
        void loadClients();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Ajouter un client'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Nouveau client</h2>
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
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Création...' : 'Créer le compte client'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Clients enregistrés
            {!loadingList && <span className="ml-2 text-sm font-normal text-gray-500">({clients.length})</span>}
          </h2>
        </div>
        {loadingList ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : clients.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Aucun client enregistré.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Ajouter le premier client →
            </button>
          </div>
        ) : (
          <ul className="divide-y">
            {clients.map((client) => (
              <li key={client.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{client.firstName} {client.lastName}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Client</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
