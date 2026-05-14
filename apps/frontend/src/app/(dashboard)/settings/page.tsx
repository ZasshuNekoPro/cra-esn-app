import { apiClient } from '../../../lib/api/client';
import { SettingsClient } from './SettingsClient';

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
      <SettingsClient initialProfile={profile} />
    </div>
  );
}
