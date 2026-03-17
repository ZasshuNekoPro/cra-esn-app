import type { MonthlyReport } from '@esn/shared-types';
import { CraStatus } from '@esn/shared-types';

const CRA_STATUS_LABELS: Record<CraStatus, string> = {
  [CraStatus.DRAFT]:           'Brouillon',
  [CraStatus.SUBMITTED]:       'Soumis',
  [CraStatus.SIGNED_EMPLOYEE]: 'Signé (salarié)',
  [CraStatus.SIGNED_ESN]:      'Signé (ESN)',
  [CraStatus.SIGNED_CLIENT]:   'Signé (client)',
  [CraStatus.LOCKED]:          'Verrouillé',
};

const CRA_STATUS_COLORS: Record<CraStatus, string> = {
  [CraStatus.DRAFT]:           'bg-gray-100 text-gray-700',
  [CraStatus.SUBMITTED]:       'bg-blue-100 text-blue-700',
  [CraStatus.SIGNED_EMPLOYEE]: 'bg-indigo-100 text-indigo-700',
  [CraStatus.SIGNED_ESN]:      'bg-purple-100 text-purple-700',
  [CraStatus.SIGNED_CLIENT]:   'bg-teal-100 text-teal-700',
  [CraStatus.LOCKED]:          'bg-green-100 text-green-700',
};

interface Props {
  report: MonthlyReport;
}

export function MonthSummaryCard({ report }: Props): JSX.Element {
  const monthLabel = new Date(report.year, report.month - 1, 1).toLocaleString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  const progress = report.workingDaysInMonth > 0
    ? Math.min(100, Math.round((report.totalWorkDays / report.workingDaysInMonth) * 100))
    : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 capitalize">{monthLabel}</h2>
          <p className="text-sm text-gray-500">{report.missionTitle}</p>
        </div>
        {report.craStatus && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CRA_STATUS_COLORS[report.craStatus]}`}>
            {CRA_STATUS_LABELS[report.craStatus]}
          </span>
        )}
      </div>

      {/* Days bar */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-600">
            {report.totalWorkDays} / {report.workingDaysInMonth} jours
          </span>
          {report.isOvertime && (
            <span className="font-medium text-orange-600">Heures sup.</span>
          )}
        </div>
        <div className="h-2 rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${report.isOvertime ? 'bg-orange-400' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Day type breakdown */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-gray-100 text-center">
        <div className="pr-3">
          <p className="text-lg font-semibold text-gray-900">{report.totalWorkDays}</p>
          <p className="text-xs text-gray-500">Travaillés</p>
        </div>
        <div className="px-3">
          <p className="text-lg font-semibold text-gray-900">{report.totalLeaveDays}</p>
          <p className="text-xs text-gray-500">Congés</p>
        </div>
        <div className="pl-3">
          <p className="text-lg font-semibold text-gray-900">{report.totalSickDays}</p>
          <p className="text-xs text-gray-500">Maladie</p>
        </div>
      </div>

      {/* PDF link */}
      {report.pdfUrl && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <a
            href={report.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Télécharger le CRA PDF →
          </a>
        </div>
      )}
    </div>
  );
}
