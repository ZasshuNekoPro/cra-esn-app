import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { reportsApi } from '../../../../../../lib/api/reports';
import { ApiClientError } from '../../../../../../lib/api/client';

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

interface Props {
  params: { id: string };
}

export default async function ValidationDetailPage({ params }: Props): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  let report;
  // Proxy through Next.js to avoid mixed-content blocking on HTTPS pages
  const pdfUrl = `/api/reports/validation/${params.id}/pdf`;

  try {
    report = await reportsApi.getValidation(params.id);
  } catch (err) {
    if (err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 403)) {
      redirect('/login');
    }
    if (err instanceof ApiClientError && err.statusCode === 404) {
      redirect('/esn/admin/reports');
    }
    redirect('/esn/admin/reports');
  }

  const isExpired = new Date(report.expiresAt) < new Date();
  const statusInfo = STATUS_LABELS[report.status] ?? { label: report.status, className: 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/esn/admin/reports" className="text-sm text-gray-500 hover:text-gray-700">
          ← Retour aux rapports
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{report.employeeName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {MONTH_NAMES[(report.month - 1)] ?? report.month} {report.year}
              {' · '}
              {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded font-medium ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-8">
          <div>
            <dt className="text-gray-500">Envoyé le</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {new Date(report.createdAt).toLocaleDateString('fr-FR')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Expire le</dt>
            <dd className={`font-medium mt-0.5 ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(report.expiresAt).toLocaleDateString('fr-FR')}
              {isExpired && ' (expiré)'}
            </dd>
          </div>
          {report.resolvedBy && (
            <div>
              <dt className="text-gray-500">Traité par</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{report.resolvedBy}</dd>
            </div>
          )}
          {report.resolvedAt && (
            <div>
              <dt className="text-gray-500">Traité le</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {new Date(report.resolvedAt).toLocaleDateString('fr-FR')}
              </dd>
            </div>
          )}
          {report.comment && (
            <div className="col-span-2">
              <dt className="text-gray-500">Commentaire</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{report.comment}</dd>
            </div>
          )}
        </dl>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
            >
              Ouvrir le rapport (PDF)
            </a>
          )}
          {report.status === 'PENDING' && !isExpired && (
            <a
              href={`/validate-report/${report.token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Valider ce rapport →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
