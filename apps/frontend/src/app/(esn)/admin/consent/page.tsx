import { consentApi } from '../../../../lib/api/consent';
import { ConsentList } from '../../../../components/consent/ConsentList';
import { RequestConsentForm } from '../../../../components/consent/RequestConsentForm';

export default async function AdminConsentPage(): Promise<JSX.Element> {
  const consents = await consentApi.listSent().catch(() => []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des accès salariés</h1>
        <p className="mt-1 text-sm text-gray-500">
          Demandez et suivez vos accès aux données des salariés.
        </p>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Nouvelle demande d'accès
        </h2>
        <RequestConsentForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Mes demandes en cours
        </h2>
        <ConsentList initialConsents={consents} />
      </section>
    </div>
  );
}
