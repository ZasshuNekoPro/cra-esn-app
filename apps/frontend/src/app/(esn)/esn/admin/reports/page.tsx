import { reportsApi } from '../../../../../lib/api/reports';
import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import { ApiClientError } from '../../../../../lib/api/client';
import type { ReportValidationItemForEsn } from '@esn/shared-types';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const REPORT_TYPE_LABELS: Record<string, string> = {
  CRA_ONLY: 'CRA',
  CRA_WITH_WEATHER: 'CRA + Météo',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  VALIDATED: { label: 'Validé', className: 'bg-green-100 text-green-800' },
  REFUSED: { label: 'Refusé', className: 'bg-red-100 text-red-800' },
  ARCHIVED: { label: 'Archivé', className: 'bg-gray-100 text-gray-600' },
};

export default async function EsnReportsPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  let reports: ReportValidationItemForEsn[];
  try {
    reports = await reportsApi.listForEsn();
  } catch (err) {
    if (err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 403)) {
      redirect('/login');
    }
    reports = [];
  }

  const pending = reports.filter((r) => r.status === 'PENDING');
  const resolved = reports.filter((r) => r.status !== 'PENDING');

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Rapports à valider</h1>
      <p className="text-sm text-gray-500 mb-8">
        Rapports mensuels envoyés par vos salariés pour validation ESN ({pending.length} en attente)
      </p>

      {reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
          <p className="text-sm">Aucun rapport reçu pour le moment.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                En attente ({pending.length})
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Salarié</th>
                      <th className="px-6 py-3">Période</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Envoyé le</th>
                      <th className="px-6 py-3">Expire le</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map((r) => {
                      const isExpired = new Date(r.expiresAt) < new Date();
                      return (
                        <tr key={r.id} className="text-gray-700">
                          <td className="px-6 py-4 font-medium">{r.employeeName}</td>
                          <td className="px-6 py-4">
                            {MONTH_NAMES[(r.month - 1)] ?? r.month} {r.year}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}
                          </td>
                          <td className="px-6 py-4 tabular-nums text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 tabular-nums">
                            <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {new Date(r.expiresAt).toLocaleDateString('fr-FR')}
                              {isExpired && ' (expiré)'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isExpired ? (
                              <span className="text-xs text-gray-400">Lien expiré</span>
                            ) : (
                              <a
                                href={`/reports/validate/${r.token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-600 hover:underline font-medium"
                              >
                                Valider →
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Historique ({resolved.length})
              </h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3">Salarié</th>
                      <th className="px-6 py-3">Période</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Statut</th>
                      <th className="px-6 py-3">Traité le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {resolved.map((r) => {
                      const statusInfo = STATUS_LABELS[r.status] ?? { label: r.status, className: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={r.id} className="text-gray-700">
                          <td className="px-6 py-4 font-medium">{r.employeeName}</td>
                          <td className="px-6 py-4">
                            {MONTH_NAMES[(r.month - 1)] ?? r.month} {r.year}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 tabular-nums text-gray-500">
                            {r.resolvedAt
                              ? new Date(r.resolvedAt).toLocaleDateString('fr-FR')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
