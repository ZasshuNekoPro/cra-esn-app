'use client';

import { useState } from 'react';
import { ValidateReportForm } from './ValidateReportForm';
import type { ValidateReportResponse } from '@esn/shared-types';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'En attente de validation', className: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  VALIDATED: { label: 'Validé',                   className: 'text-green-700 bg-green-50 border-green-200' },
  REFUSED:   { label: 'Refusé',                   className: 'text-red-700 bg-red-50 border-red-200' },
  ARCHIVED:  { label: 'Lien expiré ou remplacé',  className: 'text-gray-600 bg-gray-50 border-gray-200' },
};

interface Props {
  token: string;
  initialStatus: string;
  initialComment: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  expiresAt: string;
  isPending: boolean;
  isExpired: boolean;
}

export function ValidateReportInteractive({
  token,
  initialStatus,
  initialComment,
  resolvedBy,
  resolvedAt,
  expiresAt,
  isPending,
  isExpired,
}: Props): JSX.Element {
  const [displayStatus, setDisplayStatus] = useState(initialStatus);
  const [submitResult, setSubmitResult] = useState<ValidateReportResponse | null>(null);

  const handleResult = (result: ValidateReportResponse): void => {
    setDisplayStatus(result.status);
    setSubmitResult(result);
  };

  const statusInfo = STATUS_LABELS[displayStatus];

  return (
    <>
      {/* Status badge — updates reactively after submit */}
      <div
        className={`mb-4 rounded-lg border px-4 py-2 text-sm font-medium ${
          statusInfo?.className ?? 'bg-gray-50 text-gray-600 border-gray-200'
        }`}
      >
        Statut : {statusInfo?.label ?? displayStatus}
        {resolvedBy && !submitResult && (
          <span className="ml-1 font-normal">
            — par {resolvedBy}
            {resolvedAt && ` le ${new Date(resolvedAt).toLocaleDateString('fr-FR')}`}
          </span>
        )}
      </div>

      {/* Comment on refused (initial load, already resolved) */}
      {initialStatus === 'REFUSED' && !submitResult && initialComment && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span className="font-medium">Motif du refus :</span> {initialComment}
        </div>
      )}

      {/* Expiry notice */}
      {displayStatus === 'PENDING' && (
        <p className="mb-4 text-xs text-gray-400">
          {isExpired
            ? 'Ce lien a expiré.'
            : `Lien valide jusqu'au ${new Date(expiresAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`}
        </p>
      )}

      {/* Form — only when PENDING, not expired, and no result yet */}
      {isPending && !submitResult && (
        <ValidateReportForm token={token} onResult={handleResult} />
      )}

      {/* Result confirmation — stays visible after submit */}
      {submitResult && (
        <div
          className={`rounded-lg border px-4 py-4 text-center text-sm font-medium ${
            submitResult.status === 'VALIDATED'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p className="text-base font-semibold">
            {submitResult.status === 'VALIDATED' ? 'Rapport validé ✓' : 'Rapport refusé'}
          </p>
          {submitResult.allValidated && (
            <p className="mt-1 text-xs opacity-80">
              Tous les destinataires ont validé ce rapport.
            </p>
          )}
        </div>
      )}

      {/* Already resolved before page load */}
      {!isPending && initialStatus !== 'PENDING' && !submitResult && (
        <p className="text-center text-sm text-gray-500">
          Ce rapport a déjà été traité. Aucune action supplémentaire requise.
        </p>
      )}

      {/* Expired but still PENDING */}
      {initialStatus === 'PENDING' && isExpired && !submitResult && (
        <p className="text-center text-sm text-gray-500">
          Le délai de validation est dépassé. Contactez votre ESN pour un nouvel envoi.
        </p>
      )}
    </>
  );
}
