'use client';

import { useState } from 'react';
import type { ReportType, ReportRecipient, SendReportTtlHours } from '@esn/shared-types';
import { useSendReport } from '../../hooks/useSendReport';

interface Props {
  year: number;
  month: number;
  onClose: () => void;
}

const TTL_OPTIONS: Array<{ value: SendReportTtlHours; label: string }> = [
  { value: 24, label: '24 heures' },
  { value: 48, label: '48 heures (défaut)' },
  { value: 72, label: '3 jours' },
  { value: 168, label: '7 jours' },
];

export function SendReportModal({ year, month, onClose }: Props): JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [reportType, setReportType] = useState<ReportType>('CRA_ONLY');
  const [recipients, setRecipients] = useState<ReportRecipient[]>(['ESN']);
  const [validationTtlHours, setValidationTtlHours] = useState<SendReportTtlHours>(48);

  const { mutate, isPending, isSuccess, isError, data, error } = useSendReport(year, month);

  const toggleRecipient = (r: ReportRecipient): void => {
    setRecipients((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  const handleSubmit = (): void => {
    mutate({ year, month, reportType, recipients, validationTtlHours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Envoyer le rapport mensuel</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Success state */}
        {isSuccess && data ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-700">Rapport envoyé avec succès.</p>
            {data.skippedRecipients.length > 0 && (
              <p className="text-sm text-amber-600">
                {`Destinataire(s) ignoré(s) — non configuré(s) sur la mission : ${data.skippedRecipients.map((r) => (r === 'CLIENT' ? 'Client' : 'ESN')).join(', ')}.`}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Error */}
            {isError && error && (
              <p className="mb-3 text-sm text-red-600">{error.message}</p>
            )}

            {/* Step 1 — Report type */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Choisissez le type de rapport à générer et envoyer.
                </p>

                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="reportType"
                      value="CRA_ONLY"
                      checked={reportType === 'CRA_ONLY'}
                      onChange={() => setReportType('CRA_ONLY')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800">CRA uniquement</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="reportType"
                      value="CRA_WITH_WEATHER"
                      checked={reportType === 'CRA_WITH_WEATHER'}
                      onChange={() => setReportType('CRA_WITH_WEATHER')}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800">CRA + météo projet</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ttl-select" className="text-xs font-medium text-gray-500">
                    Durée de validité du lien
                  </label>
                  <select
                    id="ttl-select"
                    value={validationTtlHours}
                    onChange={(e) => setValidationTtlHours(Number(e.target.value) as SendReportTtlHours)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TTL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Recipients */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Choisissez les destinataires du rapport.
                </p>

                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={recipients.includes('ESN')}
                      onChange={() => toggleRecipient('ESN')}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800">ESN (votre responsable)</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={recipients.includes('CLIENT')}
                      onChange={() => toggleRecipient('CLIENT')}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800">Client</span>
                  </label>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || recipients.length === 0}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isPending ? 'Envoi en cours…' : 'Envoyer'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
