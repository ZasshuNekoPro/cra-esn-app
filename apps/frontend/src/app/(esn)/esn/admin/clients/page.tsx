'use client';

import { useState, useEffect } from 'react';
import { ClientContactType } from '@esn/shared-types';
import type { PublicUser } from '../../../../../lib/api/users';
import type { ClientCompany, ClientContact, CreateContactPayload } from '../../../../../lib/api/clientCompanies';
import { CONTACT_TYPE_LABELS } from '../../../../../lib/api/clientCompanies';
import {
  listPersonClientsAction,
  listClientCompaniesAction,
  createPersonClientAction,
  createClientCompanyAction,
  updateClientAction,
  updateClientCompanyAction,
  addContactToCompanyAction,
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

const emptyContact = (): CreateContactPayload & { uid: number } => ({
  uid: Date.now() + Math.random(),
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

// ── Edit state types ──────────────────────────────────────────────────────────

interface EditableExistingContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  contactType: ClientContactType | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClientsPage(): JSX.Element {
  const [personClients, setPersonClients] = useState<PublicUser[]>([]);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientType, setClientType] = useState<'person' | 'company'>('person');

  // Person form
  const [personForm, setPersonForm] = useState(emptyPersonForm());

  // Company creation form
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm());
  const [contacts, setContacts] = useState<(CreateContactPayload & { uid: number })[]>([emptyContact()]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Unified company edit state ────────────────────────────────────────────
  const [editingCompany, setEditingCompany] = useState<ClientCompany | null>(null);
  const [editCompanyFields, setEditCompanyFields] = useState(emptyCompanyForm());
  const [editExistingContacts, setEditExistingContacts] = useState<EditableExistingContact[]>([]);
  const [editNewContacts, setEditNewContacts] = useState<(CreateContactPayload & { uid: number })[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Person edit state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientForm, setEditClientForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [editClientError, setEditClientError] = useState<string | null>(null);
  const [editClientSubmitting, setEditClientSubmitting] = useState(false);

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

  // ── Company creation submit ────────────────────────────────────────────────

  const addNewContact = (): void => {
    setContacts((prev) => [...prev, emptyContact()]);
  };

  const removeNewContact = (uid: number): void => {
    setContacts((prev) => prev.filter((c) => c.uid !== uid));
  };

  const updateNewContact = (
    uid: number,
    field: keyof Omit<CreateContactPayload, 'contactType'> | 'contactType',
    value: string,
  ): void => {
    setContacts((prev) =>
      prev.map((c) => c.uid === uid ? { ...c, [field]: value } : c),
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
        contacts: contacts.map(({ uid: _uid, phone, ...rest }) => ({
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

  // ── Unified company edit ───────────────────────────────────────────────────

  const startEditCompany = (company: ClientCompany): void => {
    setEditingCompany(company);
    setEditCompanyFields({
      name: company.name,
      siren: company.siren ?? '',
      address: company.address ?? '',
      website: company.website ?? '',
      notes: company.notes ?? '',
    });
    setEditExistingContacts(
      company.contacts.map((c: ClientContact) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone ?? '',
        contactType: c.clientContactType,
      })),
    );
    setEditNewContacts([]);
    setEditError(null);
  };

  const cancelEditCompany = (): void => {
    setEditingCompany(null);
    setEditError(null);
  };

  const updateExistingContact = (id: string, field: keyof EditableExistingContact, value: string): void => {
    setEditExistingContacts((prev) =>
      prev.map((c) => c.id === id ? { ...c, [field]: value } : c),
    );
  };

  const addEditNewContact = (): void => {
    setEditNewContacts((prev) => [...prev, emptyContact()]);
  };

  const removeEditNewContact = (uid: number): void => {
    setEditNewContacts((prev) => prev.filter((c) => c.uid !== uid));
  };

  const updateEditNewContact = (
    uid: number,
    field: keyof Omit<CreateContactPayload, 'contactType'> | 'contactType',
    value: string,
  ): void => {
    setEditNewContacts((prev) =>
      prev.map((c) => c.uid === uid ? { ...c, [field]: value } : c),
    );
  };

  const handleEditCompanySubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editingCompany) return;
    setEditError(null);
    setEditSubmitting(true);
    try {
      // 1. Update company fields
      const companyResult = await updateClientCompanyAction(editingCompany.id, {
        name: editCompanyFields.name,
        siren: editCompanyFields.siren || undefined,
        address: editCompanyFields.address || undefined,
        website: editCompanyFields.website || undefined,
        notes: editCompanyFields.notes || undefined,
      });
      if (companyResult.error) { setEditError(companyResult.error); return; }

      // 2. Update existing contacts
      for (const contact of editExistingContacts) {
        const result = await updateClientAction(contact.id, {
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone || undefined,
        });
        if (result.error) { setEditError(result.error); return; }
      }

      // 3. Add new contacts
      for (const contact of editNewContacts) {
        const result = await addContactToCompanyAction(editingCompany.id, {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          password: contact.password,
          contactType: contact.contactType,
          phone: contact.phone || undefined,
        });
        if (result.error) { setEditError(result.error); return; }
      }

      setEditingCompany(null);
      void loadData();
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Person edit ───────────────────────────────────────────────────────────

  const startEditClient = (client: PublicUser): void => {
    setEditingClientId(client.id);
    setEditClientForm({ firstName: client.firstName, lastName: client.lastName, phone: client.phone ?? '' });
    setEditClientError(null);
  };

  const cancelEditClient = (): void => {
    setEditingClientId(null);
    setEditClientError(null);
  };

  const handleEditClientSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editingClientId) return;
    setEditClientError(null);
    setEditClientSubmitting(true);
    try {
      const result = await updateClientAction(editingClientId, {
        firstName: editClientForm.firstName,
        lastName: editClientForm.lastName,
        phone: editClientForm.phone || undefined,
      });
      if (result.error) {
        setEditClientError(result.error);
      } else {
        setEditingClientId(null);
        void loadData();
      }
    } finally {
      setEditClientSubmitting(false);
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
            <CompanyForm
              companyForm={companyForm}
              setCompanyForm={setCompanyForm}
              contacts={contacts}
              onAddContact={addNewContact}
              onRemoveContact={removeNewContact}
              onUpdateContact={updateNewContact}
              error={error}
              submitting={submitting}
              onSubmit={(e) => { void handleCompanySubmit(e); }}
              submitLabel={submitting ? 'Création en cours...' : `Créer la société et ${contacts.length} contact${contacts.length > 1 ? 's' : ''}`}
            />
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
                    {editingCompany?.id === company.id ? (
                      /* ── Formulaire d'édition unifié ── */
                      <form onSubmit={(e) => { void handleEditCompanySubmit(e); }} className="space-y-5">
                        <h3 className="font-medium text-gray-900 text-sm">Modifier la société</h3>

                        {/* Infos société */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Raison sociale <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              required
                              value={editCompanyFields.name}
                              onChange={(e) => setEditCompanyFields((f) => ({ ...f, name: e.target.value }))}
                              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">SIREN (optionnel)</label>
                              <input
                                type="text"
                                value={editCompanyFields.siren}
                                onChange={(e) => setEditCompanyFields((f) => ({ ...f, siren: e.target.value }))}
                                maxLength={9}
                                placeholder="ex : 123456789"
                                className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Site web (optionnel)</label>
                              <input
                                type="url"
                                value={editCompanyFields.website}
                                onChange={(e) => setEditCompanyFields((f) => ({ ...f, website: e.target.value }))}
                                placeholder="https://..."
                                className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse (optionnel)</label>
                            <input
                              type="text"
                              value={editCompanyFields.address}
                              onChange={(e) => setEditCompanyFields((f) => ({ ...f, address: e.target.value }))}
                              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes internes (optionnel)</label>
                            <textarea
                              value={editCompanyFields.notes}
                              onChange={(e) => setEditCompanyFields((f) => ({ ...f, notes: e.target.value }))}
                              rows={2}
                              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                        </div>

                        {/* Contacts existants */}
                        {editExistingContacts.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contacts existants</p>
                            {editExistingContacts.map((contact) => (
                              <div key={contact.id} className="border rounded-lg p-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Prénom</label>
                                    <input
                                      type="text"
                                      required
                                      value={contact.firstName}
                                      onChange={(e) => updateExistingContact(contact.id, 'firstName', e.target.value)}
                                      className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Nom</label>
                                    <input
                                      type="text"
                                      required
                                      value={contact.lastName}
                                      onChange={(e) => updateExistingContact(contact.id, 'lastName', e.target.value)}
                                      className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Téléphone (optionnel)</label>
                                  <input
                                    type="tel"
                                    value={contact.phone}
                                    onChange={(e) => updateExistingContact(contact.id, 'phone', e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Nouveaux contacts */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ajouter des contacts</p>
                            <button
                              type="button"
                              onClick={addEditNewContact}
                              className="text-blue-600 hover:underline text-xs font-medium"
                            >
                              + Nouveau contact
                            </button>
                          </div>
                          {editNewContacts.map((contact) => (
                            <div key={contact.uid} className="border border-dashed rounded-lg p-3 space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => removeEditNewContact(contact.uid)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs"
                              >
                                Supprimer
                              </button>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Fonction</label>
                                <select
                                  value={contact.contactType}
                                  onChange={(e) => updateEditNewContact(contact.uid, 'contactType', e.target.value)}
                                  className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {Object.values(ClientContactType).map((type) => (
                                    <option key={type} value={type}>{CONTACT_TYPE_LABELS[type]}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Prénom</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.firstName}
                                    onChange={(e) => updateEditNewContact(contact.uid, 'firstName', e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Nom</label>
                                  <input
                                    type="text"
                                    required
                                    value={contact.lastName}
                                    onChange={(e) => updateEditNewContact(contact.uid, 'lastName', e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Email</label>
                                  <input
                                    type="email"
                                    required
                                    value={contact.email}
                                    onChange={(e) => updateEditNewContact(contact.uid, 'email', e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Téléphone (optionnel)</label>
                                  <input
                                    type="tel"
                                    value={contact.phone ?? ''}
                                    onChange={(e) => updateEditNewContact(contact.uid, 'phone', e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                  onChange={(e) => updateEditNewContact(contact.uid, 'password', e.target.value)}
                                  className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          ))}
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
                            onClick={cancelEditCompany}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* ── Affichage normal de la société ── */
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{company.name}</p>
                            {company.siren && (
                              <p className="text-xs text-gray-400 mt-0.5">SIREN : {company.siren}</p>
                            )}
                            {company.address && (
                              <p className="text-xs text-gray-400">{company.address}</p>
                            )}
                            {company.website && (
                              <p className="text-xs text-gray-400">{company.website}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              Entreprise
                            </span>
                            <button
                              onClick={() => startEditCompany(company)}
                              className="text-xs border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium px-2.5 py-1 rounded"
                            >
                              Modifier
                            </button>
                          </div>
                        </div>
                        {company.contacts.length > 0 && (
                          <div className="mt-3 space-y-2 pl-3 border-l-2 border-gray-100">
                            {company.contacts.map((contact) => (
                              <div key={contact.id} className="flex items-center gap-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
                                  {contact.clientContactType
                                    ? CONTACT_TYPE_LABELS[contact.clientContactType]
                                    : 'Contact'}
                                </span>
                                <span className="text-sm text-gray-700">{contact.firstName} {contact.lastName}</span>
                                <span className="text-xs text-gray-400 flex-1">{contact.email}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
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
                <li key={client.id} className="px-6 py-4">
                  {editingClientId === client.id ? (
                    <form onSubmit={(e) => { void handleEditClientSubmit(e); }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                          <input
                            type="text"
                            required
                            value={editClientForm.firstName}
                            onChange={(e) => setEditClientForm((f) => ({ ...f, firstName: e.target.value }))}
                            className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                          <input
                            type="text"
                            required
                            value={editClientForm.lastName}
                            onChange={(e) => setEditClientForm((f) => ({ ...f, lastName: e.target.value }))}
                            className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone (optionnel)</label>
                        <input
                          type="tel"
                          value={editClientForm.phone}
                          onChange={(e) => setEditClientForm((f) => ({ ...f, phone: e.target.value }))}
                          className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {editClientError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{editClientError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editClientSubmitting}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {editClientSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditClient}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{client.firstName} {client.lastName}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                        {client.phone && <p className="text-xs text-gray-400">{client.phone}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Client</span>
                        <button
                          onClick={() => startEditClient(client)}
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

// ── Shared company form (create & reusable) ────────────────────────────────────

interface CompanyFormProps {
  companyForm: { name: string; siren: string; address: string; website: string; notes: string };
  setCompanyForm: React.Dispatch<React.SetStateAction<{ name: string; siren: string; address: string; website: string; notes: string }>>;
  contacts: (CreateContactPayload & { uid: number })[];
  onAddContact: () => void;
  onRemoveContact: (uid: number) => void;
  onUpdateContact: (uid: number, field: keyof Omit<CreateContactPayload, 'contactType'> | 'contactType', value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}

function CompanyForm({
  companyForm, setCompanyForm,
  contacts, onAddContact, onRemoveContact, onUpdateContact,
  error, submitting, onSubmit, submitLabel,
}: CompanyFormProps): JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
          <button type="button" onClick={onAddContact} className="text-blue-600 hover:underline text-xs font-medium">
            + Ajouter un contact
          </button>
        </div>

        {contacts.map((contact) => (
          <div key={contact.uid} className="border rounded-lg p-4 space-y-3 relative">
            {contacts.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveContact(contact.uid)}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xs"
              >
                Supprimer
              </button>
            )}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fonction</label>
              <select
                value={contact.contactType}
                onChange={(e) => onUpdateContact(contact.uid, 'contactType', e.target.value)}
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
                  onChange={(e) => onUpdateContact(contact.uid, 'firstName', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nom</label>
                <input
                  type="text"
                  required
                  value={contact.lastName}
                  onChange={(e) => onUpdateContact(contact.uid, 'lastName', e.target.value)}
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
                  onChange={(e) => onUpdateContact(contact.uid, 'email', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={contact.phone ?? ''}
                  onChange={(e) => onUpdateContact(contact.uid, 'phone', e.target.value)}
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
                onChange={(e) => onUpdateContact(contact.uid, 'password', e.target.value)}
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
        {submitLabel}
      </button>
    </form>
  );
}
