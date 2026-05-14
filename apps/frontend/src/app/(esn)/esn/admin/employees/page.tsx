'use client';

import { useState, useEffect } from 'react';
import type { PublicUser, EsnAdmin } from '../../../../../lib/api/users';
import { listEmployeesAction, createEmployeeAction, updateEmployeeAction, listAdminsAction, setReferentAction } from './actions';

export default function AdminEmployeesPage(): JSX.Element {
  const [employees, setEmployees] = useState<PublicUser[]>([]);
  const [admins, setAdmins] = useState<EsnAdmin[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', referentId: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadEmployees = async (): Promise<void> => {
    try {
      const users = await listEmployeesAction();
      setEmployees(users);
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
    void listAdminsAction().then(setAdmins);
  }, []);

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

  const startEdit = (emp: PublicUser): void => {
    setEditingId(emp.id);
    setEditForm({ firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone ?? '', referentId: emp.esnReferentId ?? '' });
    setEditError(null);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editingId) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      const emp = employees.find((u) => u.id === editingId);
      const profileResult = await updateEmployeeAction(editingId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone || undefined,
      });
      if (profileResult.error) {
        setEditError(profileResult.error);
        return;
      }

      const newReferentId = editForm.referentId || null;
      const oldReferentId = emp?.esnReferentId ?? null;
      if (newReferentId !== oldReferentId) {
        const referentResult = await setReferentAction(editingId, newReferentId);
        if (referentResult.error) {
          setEditError(referentResult.error);
          return;
        }
      }

      setEditingId(null);
      void loadEmployees();
    } finally {
      setEditSubmitting(false);
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
              <li key={emp.id} className="px-6 py-4">
                {editingId === emp.id ? (
                  <form onSubmit={(e) => { void handleEditSubmit(e); }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                        <input
                          type="text"
                          required
                          value={editForm.firstName}
                          onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                          className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                        <input
                          type="text"
                          required
                          value={editForm.lastName}
                          onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                          className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone (optionnel)</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Référent ESN</label>
                      <select
                        value={editForm.referentId}
                        onChange={(e) => setEditForm((f) => ({ ...f, referentId: e.target.value }))}
                        className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Aucun référent —</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>{a.firstName} {a.lastName}</option>
                        ))}
                      </select>
                    </div>
                    {editError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {editSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-gray-500">{emp.email}</p>
                      {emp.phone && <p className="text-xs text-gray-400">{emp.phone}</p>}
                      {emp.esnReferentId ? (
                        <p className="text-xs text-indigo-600 mt-0.5">
                          Référent : {admins.find((a) => a.id === emp.esnReferentId)?.firstName ?? ''} {admins.find((a) => a.id === emp.esnReferentId)?.lastName ?? ''}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Sans référent</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Salarié</span>
                      <button
                        onClick={() => startEdit(emp)}
                        className="text-xs border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium px-2.5 py-1 rounded"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
