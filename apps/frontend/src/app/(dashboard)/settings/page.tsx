import { apiClient } from '../../../lib/api/client';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
}

export default async function SettingsPage(): Promise<JSX.Element> {
  const profile = await apiClient.get<UserProfile>('/auth/me');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Mon profil</h2>

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
            disabled
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
            title="Fonctionnalité à venir"
          >
            Modifier
          </button>
          <button
            type="button"
            disabled
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 opacity-50 cursor-not-allowed"
            title="Fonctionnalité à venir"
          >
            Changer le mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}
