import { ValidateReportInteractive } from './ValidateReportInteractive';
import { reportValidationsApi } from '../../../lib/api/reportValidations';
import type { ValidateReportPublicInfo } from '@esn/shared-types';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  CRA_ONLY: 'CRA uniquement',
  CRA_WITH_WEATHER: 'CRA + Météo projets',
};


interface Props {
  params: { token: string };
}

export default async function ValidateReportPage({ params }: Props): Promise<JSX.Element> {
  let info: ValidateReportPublicInfo | null = null;
  let errorMessage: string | null = null;
  let isGone = false;

  try {
    info = await reportValidationsApi.getValidationInfo(params.token);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 410) {
      isGone = true;
      errorMessage = 'Ce lien de validation est expiré ou a été remplacé par un envoi plus récent.';
    } else if (e.statusCode === 404) {
      errorMessage = 'Lien de validation introuvable. Vérifiez l\'URL ou contactez votre ESN.';
    } else {
      errorMessage = e.message || 'Une erreur est survenue. Veuillez réessayer.';
    }
  }

  const isExpired = info ? new Date(info.expiresAt) < new Date() : false;
  const isPending = info?.status === 'PENDING' && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Validation de rapport mensuel</h1>
          <p className="mt-1 text-sm text-gray-500">Portail ESN CRA App</p>
        </div>

        {/* Error state */}
        {(errorMessage || (!info && !isGone)) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">
              {errorMessage ?? 'Lien invalide.'}
            </p>
          </div>
        )}

        {/* Info card */}
        {info && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">Rapport de {info.employeeName}</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {MONTH_NAMES[(info.month - 1)] ?? info.month} {info.year}
                {' · '}
                {REPORT_TYPE_LABELS[info.reportType] ?? info.reportType}
              </p>
            </div>

            <div className="px-6 py-4">
              <ValidateReportInteractive
                token={params.token}
                initialStatus={info.status}
                initialComment={info.comment}
                resolvedBy={info.resolvedBy}
                resolvedAt={info.resolvedAt}
                expiresAt={info.expiresAt}
                isPending={isPending}
                isExpired={isExpired}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
