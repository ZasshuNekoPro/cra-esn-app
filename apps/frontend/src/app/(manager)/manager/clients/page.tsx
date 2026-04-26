'use client';

import { useState, useEffect } from 'react';
import type { PublicUser } from '../../../../lib/api/users';
import { listClientsAction, createClientAction } from './actions';

interface ReferentForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface CreatedReferent extends ReferentForm {
  id: string;
}

const emptyReferent = (): ReferentForm => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
});

export default function ManagerClientsPage(): JSX.Element {
  const [clients, setClients] = useState<PublicUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [company, setCompany] = useState('');
  const [referents, setReferents] = useState<ReferentForm[]>([emptyReferent()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdReferents, setCreatedReferents] = useState<CreatedReferent[] | null>(null);

  const loadClients = async (): Promise<void> => {
    try {
      const users = await listClientsAction();
      setClients(users);
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { void loadClients(); }, []);

  const addReferent = (): void => {
    setReferents((prev) => [...prev, emptyReferent()]);
  };

  const removeReferent = (index: number): void => {
    setReferents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateReferent = (index: number, field: keyof ReferentForm, value: string): void => {
    setReferents((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const created: CreatedReferent[] = [];
    try {
      for (const ref of referents) {
        const result = await createClientAction({
          ...ref,
          company: company || undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        created.push({ ...ref, id: result.user!.id });
      }
      setCreatedReferents(created);
      setCompany('');
      setReferents([emptyReferent()]);
      void loadClients();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = (): void => {
    setCreatedReferents(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => { setShowForm((v) => !v); setCreatedReferents(null); setError(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Ajouter un client'}
        </button>
      </div>

      {showForm && (
        createdReferents ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-green-800 mb-3">Référents créés avec succès</h2>
            <p className="text-sm text-green-700 mb-4">
              Transmettez les identifiants suivants aux référents afin qu&apos;ils puissent se connecter.
              Ils pourront modifier leur mot de passe depuis leurs paramètres.
            </p>
            <ul className="space-y-3">
              {createdReferents.map((ref) => (
                <li key={ref.id} className="bg-white border border-green-200 rounded p-3 text-sm">
                  <p className="font-medium text-gray-900">{ref.firstName} {ref.lastName}</p>
                  <p className="text-gray-500">Email : <span className="font-mono text-gray-700">{ref.email}</span></p>
                  <p className="text-gray-500">Mot de passe provisoire : <span className="font-mono text-gray-700">{ref.password}</span></p>
                </li>
              ))}
            </ul>
            <button
              onClick={handleCloseSuccess}
              className="mt-4 bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { void handleSubmit(e); }}
            className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-5"
          >
            <h2 className="font-semibold text-gray-900">Nouveau client</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la structure <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ex: Acme Corp"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Référents</h3>
                <button
                  type="button"
                  onClick={addReferent}
                  className="text-blue-600 hover:underline text-xs"
                >
                  + Ajouter un référent
                </button>
              </div>

              {referents.map((ref, index) => (
                <div key={index} className="border rounded-md p-4 space-y-3 relative">
                  {referents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeReferent(index)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs"
                    >
                      Supprimer
                    </button>
                  )}
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Référent {index + 1}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Prénom</label>
                      <input
                        type="text"
                        required
                        value={ref.firstName}
                        onChange={(e) => updateReferent(index, 'firstName', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Nom</label>
                      <input
                        type="text"
                        required
                        value={ref.lastName}
                        onChange={(e) => updateReferent(index, 'lastName', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={ref.email}
                      onChange={(e) => updateReferent(index, 'email', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Mot de passe provisoire (min. 8 caractères)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={ref.password}
                      onChange={(e) => updateReferent(index, 'password', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Création en cours...' : `Créer ${referents.length} référent${referents.length > 1 ? 's' : ''}`}
            </button>
          </form>
        )
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
                  {client.company && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {client.company}
                    </p>
                  )}
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
