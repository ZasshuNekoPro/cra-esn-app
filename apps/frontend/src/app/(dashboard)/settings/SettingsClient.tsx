'use client';

import { useState } from 'react';
import { usersClientApi } from '../../../lib/api/users';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
}

interface Props {
  initialProfile: UserProfile;
}

type Mode = 'view' | 'editProfile' | 'changePassword';

export function SettingsClient({ initialProfile }: Props): JSX.Element {
  const [profile, setProfile] = useState(initialProfile);
  const [mode, setMode] = useState<Mode>('view');

  // Profile edit state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const openEditProfile = (): void => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? '');
    setProfileError(null);
    setMode('editProfile');
  };

  const openChangePassword = (): void => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setMode('changePassword');
  };

  const submitProfile = async (): Promise<void> => {
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('Prénom et nom sont requis.');
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const updated = await usersClientApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      setMode('view');
    } catch (err: unknown) {
      const e = err as Error;
      setProfileError(e.message || 'Une erreur est survenue.');
    } finally {
      setProfileLoading(false);
    }
  };

  const submitPassword = async (): Promise<void> => {
    if (!currentPassword || !newPassword) {
      setPasswordError('Tous les champs sont requis.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      await usersClientApi.changePassword({ currentPassword, newPassword });
      setMode('view');
    } catch (err: unknown) {
      const e = err as Error;
      setPasswordError(e.message || 'Une erreur est survenue.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Mon profil</h2>

      {mode === 'view' && (
        <>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Prénom</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.firstName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Nom</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.lastName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {profile.phone ?? <span className="text-gray-400">Non renseigné</span>}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={openEditProfile}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={openChangePassword}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
            >
              Changer le mot de passe
            </button>
          </div>
        </>
      )}

      {mode === 'editProfile' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitProfile();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); }}
              disabled={profileLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); }}
              disabled={profileLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); }}
              placeholder="+33 6 12 34 56 78"
              disabled={profileLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {profileError && <p className="text-sm text-red-600">{profileError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {profileLoading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('view'); }}
              disabled={profileLoading}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {mode === 'changePassword' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitPassword();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Mot de passe actuel <span className="text-red-500">*</span>
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); }}
              disabled={passwordLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); }}
              disabled={passwordLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); }}
              disabled={passwordLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {passwordLoading ? 'Modification…' : 'Modifier le mot de passe'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('view'); }}
              disabled={passwordLoading}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
