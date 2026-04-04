import Link from 'next/link';
import { reportsApi } from '../../../../lib/api/reports';
import type { ReportValidationStatus } from '@esn/shared-types';

const STATUS_LABELS: Record<ReportValidationStatus, { label: string; class: string }> = {
  PENDING: { label: 'En attente', class: 'bg-yellow-100 text-yellow-700' },
  VALIDATED: { label: 'Validé', class: 'bg-green-100 text-green-700' },
  REFUSED: { label: 'Refusé', class: 'bg-red-100 text-red-700' },
  ARCHIVED: { label: 'Archivé', class: 'bg-gray-100 text-gray-500' },
};

export default async function ClientReportsPage(): Promise<JSX.Element> {
  const reports = await reportsApi.listForClient().catch(() => []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-sm text-gray-500 mt-1">Bilans mensuels des salariés liés à vos missions.</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <p className="font-medium mb-1">Aucun rapport</p>
          <p className="text-sm">Les rapports à valider apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          {reports.map((report) => {
            const statusCfg = STATUS_LABELS[report.status];
            const expiresAt = new Date(report.expiresAt).toLocaleDateString('fr-FR');
            const createdAt = new Date(report.createdAt).toLocaleDateString('fr-FR');
            return (
              <div key={report.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Rapport du {createdAt}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Expire le {expiresAt}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${statusCfg.class}`}>
                    {statusCfg.label}
                  </span>
                  {report.status === 'PENDING' && (
                    <Link
                      href={`/validate-report/${report.token}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Valider →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
