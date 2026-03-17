import { consentApi } from '../../../lib/api/consent';
import { ConsentList } from '../../../components/consent/ConsentList';

export default async function ConsentPage(): Promise<JSX.Element> {
  const consents = await consentApi.listMine().catch(() => []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accès à mes données</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les demandes d'accès des administrateurs ESN à vos données.
        </p>
      </div>
      <ConsentList initialConsents={consents} editable />
    </div>
  );
}
