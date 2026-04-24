'use client';

import { useState, useEffect } from 'react';
import { Role } from '@esn/shared-types';
import { usersClientApi, type PublicUser } from '../../../../../lib/api/users';
import { createEmployeeAction } from './actions';

export default function AdminEmployeesPage(): JSX.Element {
  const [employees, setEmployees] = useState<PublicUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async (): Promise<void> => {
    try {
      const users = await usersClientApi.list();
      setEmployees(users.filter((u) => u.role === Role.EMPLOYEE));
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { void loadEmployees(); }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createEmployeeAction({
        ...form,
        phone: form.phone || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setForm({ firstName: '', lastName: '', email: '', password: '', phone: '' });
        setShowForm(false);
        void loadEmployees();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Salariés</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Ajouter un salarié'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Nouveau salarié</h2>
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
            {submitting ? 'Création...' : 'Créer le compte salarié'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Salariés enregistrés
            {!loadingList && <span className="ml-2 text-sm font-normal text-gray-500">({employees.length})</span>}
          </h2>
        </div>
        {loadingList ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : employees.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Aucun salarié enregistré.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Ajouter le premier salarié →
            </button>
          </div>
        ) : (
          <ul className="divide-y">
            {employees.map((emp) => (
              <li key={emp.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                  <p className="text-sm text-gray-500">{emp.email}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Salarié</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
