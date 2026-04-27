'use client';

import { useState, useEffect } from 'react';
import { ClientContactType } from '@esn/shared-types';
import type { PublicUser } from '../../../../../lib/api/users';
import type { ClientCompany, CreateContactPayload } from '../../../../../lib/api/clientCompanies';
import { CONTACT_TYPE_LABELS } from '../../../../../lib/api/clientCompanies';
import {
  listPersonClientsAction,
  listClientCompaniesAction,
  createPersonClientAction,
  createClientCompanyAction,
} from './actions';

// ── Person form state ─────────────────────────────────────────────────────────

const emptyPersonForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
});

// ── Company form state ────────────────────────────────────────────────────────

const emptyContact = (): CreateContactPayload & { id: number } => ({
  id: Date.now() + Math.random(),
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactType: ClientContactType.RESPONSABLE,
  phone: '',
});

const emptyCompanyForm = () => ({
  name: '',
  siren: '',
  address: '',
  website: '',
  notes: '',
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClientsPage(): JSX.Element {
  const [personClients, setPersonClients] = useState<PublicUser[]>([]);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientType, setClientType] = useState<'person' | 'company'>('person');

  // Person form
  const [personForm, setPersonForm] = useState(emptyPersonForm());

  // Company form
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm());
  const [contacts, setContacts] = useState<(CreateContactPayload & { id: number })[]>([emptyContact()]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    try {
      const [persons, comps] = await Promise.all([
        listPersonClientsAction(),
        listClientCompaniesAction(),
      ]);
      setPersonClients(persons);
      setCompanies(comps);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const resetForms = (): void => {
    setPersonForm(emptyPersonForm());
    setCompanyForm(emptyCompanyForm());
    setContacts([emptyContact()]);
    setError(null);
    setSuccessMsg(null);
  };

  const handleToggleForm = (): void => {
    setShowForm((v) => !v);
    resetForms();
  };

  // ── Person submit ──────────────────────────────────────────────────────────

  const handlePersonSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createPersonClientAction({
        ...personForm,
        phone: personForm.phone || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg(`Client ${result.user!.firstName} ${result.user!.lastName} créé.`);
        setPersonForm(emptyPersonForm());
        setShowForm(false);
        void loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Company submit ─────────────────────────────────────────────────────────

  const addContact = (): void => {
    setContacts((prev) => [...prev, emptyContact()]);
  };

  const removeContact = (id: number): void => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const updateContact = (
    id: number,
    field: keyof Omit<CreateContactPayload, 'contactType'> | 'contactType',
    value: string,
  ): void => {
    setContacts((prev) =>
      prev.map((c) => c.id === id ? { ...c, [field]: value } : c),
    );
  };

  const handleCompanySubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createClientCompanyAction({
        name: companyForm.name,
        siren: companyForm.siren || undefined,
        address: companyForm.address || undefined,
        website: companyForm.website || undefined,
        notes: companyForm.notes || undefined,
        contacts: contacts.map(({ id: _id, phone, ...rest }) => ({
          ...rest,
          phone: phone || undefined,
        })),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg(`Société "${result.company!.name}" et ${result.company!.contacts.length} contact(s) créés.`);
        resetForms();
        setShowForm(false);
        void loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalClients = personClients.length + companies.reduce((s, c) => s + c.contacts.length, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={handleToggleForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Ajouter un client'}
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-6">
          {successMsg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Nouveau client</h2>

          {/* Toggle personne / entreprise */}
          <div className="flex gap-2">
            {(['person', 'company'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setClientType(type); resetForms(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  clientType === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {type === 'person' ? '👤 Personne' : '🏢 Entreprise'}
              </button>
            ))}
          </div>

          {/* ── Personne form ─────────────────────────────────────── */}
          {clientType === 'person' && (
            <form onSubmit={(e) => { void handlePersonSubmit(e); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={personForm.firstName}
                    onChange={(e) => setPersonForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={personForm.lastName}
                    onChange={(e) => setPersonForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={personForm.email}
                  onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe (min. 8 caractères)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={personForm.password}
                  onChange={(e) => setPersonForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={personForm.phone}
                  onChange={(e) => setPersonForm((f) => ({ ...f, phone: e.target.value }))}
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

          {/* ── Entreprise form ───────────────────────────────────── */}
          {clientType === 'company' && (
            <form onSubmit={(e) => { void handleCompanySubmit(e); }} className="space-y-5">
              {/* Infos société */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Informations société</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raison sociale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="ex : Acme Corporation"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIREN (optionnel)</label>
                    <input
                      type="text"
                      value={companyForm.siren}
                      onChange={(e) => setCompanyForm((f) => ({ ...f, siren: e.target.value }))}
                      placeholder="ex : 123 456 789"
                      maxLength={9}
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site web (optionnel)</label>
                    <input
                      type="url"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))}
                      placeholder="https://..."
                      className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse (optionnel)</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="ex : 10 rue de la Paix, 75001 Paris"
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes (optionnel)</label>
                  <textarea
                    value={companyForm.notes}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Contacts <span className="text-red-500">*</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addContact}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    + Ajouter un contact
                  </button>
                </div>

                {contacts.map((contact) => (
                  <div key={contact.id} className="border rounded-lg p-4 space-y-3 relative">
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(contact.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs"
                      >
                        Supprimer
                      </button>
                    )}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fonction</label>
                      <select
                        value={contact.contactType}
                        onChange={(e) => updateContact(contact.id, 'contactType', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.values(ClientContactType).map((type) => (
                          <option key={type} value={type}>{CONTACT_TYPE_LABELS[type]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Prénom</label>
                        <input
                          type="text"
                          required
                          value={contact.firstName}
                          onChange={(e) => updateContact(contact.id, 'firstName', e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nom</label>
                        <input
                          type="text"
                          required
                          value={contact.lastName}
                          onChange={(e) => updateContact(contact.id, 'lastName', e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Email</label>
                        <input
                          type="email"
                          required
                          value={contact.email}
                          onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Téléphone (optionnel)</label>
                        <input
                          type="tel"
                          value={contact.phone ?? ''}
                          onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mot de passe provisoire (min. 8 caractères)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={contact.password}
                        onChange={(e) => updateContact(contact.id, 'password', e.target.value)}
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
                {submitting ? 'Création en cours...' : `Créer la société et ${contacts.length} contact${contacts.length > 1 ? 's' : ''}`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Liste des clients ──────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Entreprises */}
        {(loading || companies.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                Entreprises clientes
                {!loading && <span className="ml-2 text-sm font-normal text-gray-500">({companies.length})</span>}
              </h2>
            </div>
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
            ) : companies.length === 0 ? null : (
              <ul className="divide-y">
                {companies.map((company) => (
                  <li key={company.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{company.name}</p>
                        {company.siren && (
                          <p className="text-xs text-gray-400 mt-0.5">SIREN : {company.siren}</p>
                        )}
                        {company.address && (
                          <p className="text-xs text-gray-400">{company.address}</p>
                        )}
                      </div>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded ml-3 shrink-0">
                        Entreprise
                      </span>
                    </div>
                    {company.contacts.length > 0 && (
                      <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-gray-100">
                        {company.contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                              {contact.clientContactType
                                ? CONTACT_TYPE_LABELS[contact.clientContactType]
                                : 'Contact'}
                            </span>
                            <span className="text-sm text-gray-700">{contact.firstName} {contact.lastName}</span>
                            <span className="text-xs text-gray-400">{contact.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Personnes */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">
              Contacts individuels
              {!loading && <span className="ml-2 text-sm font-normal text-gray-500">({personClients.length})</span>}
            </h2>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
          ) : personClients.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              Aucun contact individuel.{' '}
              <button onClick={() => { setShowForm(true); setClientType('person'); }} className="text-blue-600 hover:underline">
                Ajouter →
              </button>
            </div>
          ) : (
            <ul className="divide-y">
              {personClients.map((client) => (
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

        {!loading && totalClients === 0 && (
          <div className="bg-white rounded-lg shadow-sm border px-6 py-10 text-center text-gray-500">
            <p>Aucun client enregistré.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Ajouter le premier client →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
