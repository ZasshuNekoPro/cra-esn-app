'use client';

import { useState, useEffect } from 'react';
import type { PublicUser } from '../../../../../lib/api/users';
import type { Mission } from '../../../../../lib/api/missions';
import { listMissionsAndUsersAction, createMissionAction } from './actions';

export default function AdminMissionsPage(): JSX.Element {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [employees, setEmployees] = useState<PublicUser[]>([]);
  const [clients, setClients] = useState<PublicUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    dailyRate: '',
    employeeId: '',
    clientId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async (): Promise<void> => {
    try {
      const { missions, employees, clients } = await listMissionsAndUsersAction();
      setMissions(missions);
      setEmployees(employees);
      setClients(clients);
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createMissionAction({
        title: form.title,
        description: form.description || undefined,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : undefined,
        employeeId: form.employeeId,
        clientId: form.clientId || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setForm({ title: '', description: '', startDate: '', endDate: '', dailyRate: '', employeeId: '', clientId: '' });
        setShowForm(false);
        void loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Créer une mission'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { void handleSubmit(e); }}
          className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">Nouvelle mission</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin (optionnel)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TJM en € (optionnel)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.dailyRate}
              onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salarié</label>
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sélectionner un salarié —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client (optionnel)</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName} ({client.email})
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Création...' : 'Créer la mission'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Missions actives
            {!loadingList && <span className="ml-2 text-sm font-normal text-gray-500">({missions.filter((m) => m.isActive).length})</span>}
          </h2>
        </div>
        {loadingList ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : missions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Aucune mission enregistrée.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Créer la première mission →
            </button>
          </div>
        ) : (
          <ul className="divide-y">
            {missions.map((mission) => (
              <li key={mission.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{mission.title}</p>
                  <p className="text-sm text-gray-500">
                    Début : {new Date(mission.startDate).toLocaleDateString('fr-FR')}
                    {mission.endDate && ` — Fin : ${new Date(mission.endDate).toLocaleDateString('fr-FR')}`}
                    {mission.dailyRate !== null && ` · ${mission.dailyRate} €/j`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${mission.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {mission.isActive ? 'Active' : 'Terminée'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
