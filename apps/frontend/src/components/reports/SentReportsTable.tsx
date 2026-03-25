'use client';

import { useState } from 'react';
import type { SentReportHistoryItem, ReportValidationItem, ReportValidationStatus, ReportDownloadResponse } from '@esn/shared-types';
import { clientApiFetch } from '../../lib/api/clientFetch';


const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  CRA_ONLY: 'CRA uniquement',
  CRA_WITH_WEATHER: 'CRA + Météo projets',
};

const RECIPIENT_LABELS: Record<string, string> = {
  ESN: 'ESN',
  CLIENT: 'Client',
};

const STATUS_CONFIG: Record<ReportValidationStatus, { label: string; className: string }> = {
  PENDING:   { label: 'En attente', className: 'bg-yellow-50 text-yellow-700' },
  VALIDATED: { label: 'Validé',     className: 'bg-green-50 text-green-700' },
  REFUSED:   { label: 'Refusé',     className: 'bg-red-50 text-red-700' },
  ARCHIVED:  { label: 'Archivé',    className: 'bg-gray-50 text-gray-500' },
};

function ValidationBadge({ v }: { v: ReportValidationItem }): JSX.Element {
  const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.PENDING;
  const recipientLabel = RECIPIENT_LABELS[v.recipient] ?? v.recipient;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
      title={v.status === 'REFUSED' && v.comment ? `Motif : ${v.comment}` : undefined}
    >
      {recipientLabel} — {cfg.label}
      {v.status === 'REFUSED' && v.comment && (
        <span className="ml-1 cursor-help underline decoration-dotted">(?)</span>
      )}
    </span>
  );
}

function DownloadButton({ id }: { id: string }): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (): Promise<void> => {
    setLoading(true);
    try {
      const { url } = await clientApiFetch<ReportDownloadResponse>(`/reports/sent-history/${id}/download`);

      // Always fetch as an authenticated blob: sending a Bearer token to
      // presigned S3/MinIO URLs is harmless (extra header is ignored).
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const token = (session as { accessToken?: string } | null)?.accessToken ?? '';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `rapport-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => { void handleDownload(); }}
      disabled={loading}
      className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60"
      aria-label="Télécharger le PDF"
    >
      {loading ? '…' : 'PDF'}
    </button>
  );
}

interface Props {
  items: SentReportHistoryItem[];
}

export function SentReportsTable({ items }: Props): JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">Aucun rapport envoyé pour le moment.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="pb-3 pr-6">Date d'envoi</th>
            <th className="pb-3 pr-6">Période</th>
            <th className="pb-3 pr-6">Type de rapport</th>
            <th className="pb-3 pr-6">Destinataires</th>
            <th className="pb-3 pr-6">Statut validation</th>
            <th className="pb-3">PDF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const sentAt = new Date(item.sentAt);
            const dateLabel = sentAt.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const periodLabel = `${MONTH_NAMES[(item.month - 1)] ?? item.month} ${item.year}`;
            const typeLabel = REPORT_TYPE_LABELS[item.reportType] ?? item.reportType;
            const recipientsLabel = item.sentTo
              .map((r) => RECIPIENT_LABELS[r] ?? r)
              .join(', ');

            return (
              <tr key={item.id} className="text-gray-700">
                <td className="py-3 pr-6 tabular-nums">{dateLabel}</td>
                <td className="py-3 pr-6 capitalize">{periodLabel}</td>
                <td className="py-3 pr-6">{typeLabel}</td>
                <td className="py-3 pr-6">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {recipientsLabel}
                  </span>
                </td>
                <td className="py-3 pr-6">
                  <div className="flex flex-wrap gap-1">
                    {item.validations.length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      item.validations.map((v) => (
                        <ValidationBadge key={v.id} v={v} />
                      ))
                    )}
                  </div>
                </td>
                <td className="py-3">
                  <DownloadButton id={item.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
