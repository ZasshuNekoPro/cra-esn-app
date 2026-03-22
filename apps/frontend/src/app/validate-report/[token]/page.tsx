import { ValidateReportForm } from './ValidateReportForm';
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'En attente de validation',   className: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  VALIDATED: { label: 'Validé',                      className: 'text-green-700 bg-green-50 border-green-200' },
  REFUSED:   { label: 'Refusé',                      className: 'text-red-700 bg-red-50 border-red-200' },
  ARCHIVED:  { label: 'Lien expiré ou remplacé',     className: 'text-gray-600 bg-gray-50 border-gray-200' },
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
              {/* Current status badge */}
              <div
                className={`mb-4 rounded-lg border px-4 py-2 text-sm font-medium ${
                  STATUS_LABELS[info.status]?.className ?? 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                Statut : {STATUS_LABELS[info.status]?.label ?? info.status}
                {info.resolvedBy && (
                  <span className="ml-1 font-normal">
                    — par {info.resolvedBy}
                    {info.resolvedAt &&
                      ` le ${new Date(info.resolvedAt).toLocaleDateString('fr-FR')}`}
                  </span>
                )}
              </div>

              {/* Comment on refused */}
              {info.status === 'REFUSED' && info.comment && (
                <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                  <span className="font-medium">Motif du refus :</span> {info.comment}
                </div>
              )}

              {/* Expiry notice */}
              {info.status === 'PENDING' && (
                <p className="mb-4 text-xs text-gray-400">
                  {isExpired
                    ? 'Ce lien a expiré.'
                    : `Lien valide jusqu'au ${new Date(info.expiresAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                </p>
              )}

              {/* Validation form — only if PENDING and not expired */}
              {isPending && <ValidateReportForm token={params.token} />}

              {/* Already resolved — no form */}
              {!isPending && info.status !== 'PENDING' && (
                <p className="text-center text-sm text-gray-500">
                  Ce rapport a déjà été traité. Aucune action supplémentaire requise.
                </p>
              )}

              {/* Expired but still PENDING */}
              {info.status === 'PENDING' && isExpired && (
                <p className="text-center text-sm text-gray-500">
                  Le délai de validation est dépassé. Contactez votre ESN pour un nouvel envoi.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
