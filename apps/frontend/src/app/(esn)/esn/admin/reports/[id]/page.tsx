import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '../../../../../../auth';
import { reportsApi } from '../../../../../../lib/api/reports';
import { ApiClientError } from '../../../../../../lib/api/client';
import type { ValidationCraPreview, ValidationCraPreviewEntry } from '@esn/shared-types';

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

const ENTRY_TYPE_COLORS: Record<string, string> = {
  WORK_ONSITE: 'bg-blue-100 text-blue-800',
  WORK_REMOTE: 'bg-cyan-100 text-cyan-800',
  WORK_TRAVEL: 'bg-sky-100 text-sky-800',
  LEAVE_CP: 'bg-yellow-100 text-yellow-800',
  LEAVE_RTT: 'bg-amber-100 text-amber-800',
  SICK: 'bg-orange-100 text-orange-800',
  HOLIDAY: 'bg-gray-200 text-gray-600',
  TRAINING: 'bg-indigo-100 text-indigo-800',
  ASTREINTE: 'bg-rose-100 text-rose-800',
  OVERTIME: 'bg-red-100 text-red-800',
};

const ENTRY_TYPE_LABELS: Record<string, string> = {
  WORK_ONSITE: 'Prés.', WORK_REMOTE: 'TT', WORK_TRAVEL: 'Dépl.',
  LEAVE_CP: 'CP', LEAVE_RTT: 'RTT', SICK: 'Mal.',
  HOLIDAY: 'Fér.', TRAINING: 'Form.', ASTREINTE: 'Ast.', OVERTIME: 'Sup.',
};

const MODIFIER_ICONS: Record<string, string> = {
  TRAVEL: '✈', TRAINING: '📚', ON_CALL: '📞', OVERTIME: '⊕',
};

const WEATHER_ICONS: Record<string, string> = {
  SUNNY: '☀️', CLOUDY: '⛅', RAINY: '🌧️', STORM: '⛈️',
  VALIDATION_PENDING: '🔶', VALIDATED: '✅',
};

const WEATHER_LABELS: Record<string, string> = {
  SUNNY: 'Ensoleillé', CLOUDY: 'Nuageux', RAINY: 'Pluvieux',
  STORM: 'Orageux', VALIDATION_PENDING: 'En attente', VALIDATED: 'Validé',
};

interface Props {
  params: { id: string };
}

function CraCalendar({ year, month, entries }: { year: number; month: number; entries: ValidationCraPreviewEntry[] }) {
  const dayMap = new Map<number, ValidationCraPreviewEntry>();
  for (const e of entries) {
    dayMap.set(new Date(e.date).getUTCDate(), e);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Mon=0

  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {DOW.map((d) => (
            <th key={d} className="text-center py-1 px-0.5 text-gray-500 font-medium bg-gray-50 border border-gray-100 w-[14.28%]">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chunkWeeks([...blanks.map(() => null), ...days]).map((week, wi) => (
          <tr key={wi}>
            {week.map((day, di) => {
              const entry = day !== null ? dayMap.get(day) : undefined;
              const colorClass = entry ? (ENTRY_TYPE_COLORS[entry.entryType] ?? 'bg-gray-100 text-gray-600') : '';
              const label = entry ? (ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType) : '';
              return (
                <td
                  key={di}
                  className={`border border-gray-100 text-center align-top p-0.5 min-h-[32px] ${day === null ? 'bg-gray-50' : ''}`}
                >
                  {day !== null && (
                    <>
                      <div className="text-gray-400 text-[9px] leading-none mb-0.5">{day}</div>
                      {entry && (
                        <div className={`rounded text-[9px] font-medium px-0.5 leading-tight ${colorClass}`} title={entry.comment ?? undefined}>
                          {label}
                          {entry.dayFraction < 1 && <span className="opacity-60"> ½</span>}
                          {entry.dayFraction < 1 && entry.secondHalfType && (
                            <div className="opacity-70">+{ENTRY_TYPE_LABELS[entry.secondHalfType] ?? entry.secondHalfType}</div>
                          )}
                          {entry.modifiers.length > 0 && (
                            <div className="flex justify-center gap-0.5 flex-wrap mt-0.5">
                              {entry.modifiers.map((mod) => (
                                <span key={mod} title={mod}>{MODIFIER_ICONS[mod] ?? mod}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function chunkWeeks<T>(items: (T | null)[]): (T | null)[][] {
  const weeks: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 7) {
    const week = items.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export default async function ValidationDetailPage({ params }: Props): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  const pdfUrl = `/api/reports/validation/${params.id}/pdf`;

  let report;
  let preview: ValidationCraPreview | null = null;

  try {
    report = await reportsApi.getValidation(params.id);
  } catch (err) {
    if (err instanceof ApiClientError && (err.statusCode === 401 || err.statusCode === 403)) {
      redirect('/login');
    }
    redirect('/esn/admin/reports');
  }

  try {
    preview = await reportsApi.getValidationCraPreview(params.id);
  } catch {
    // Non-blocking — page still works without preview data
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

      {/* CRA Calendar Preview */}
      {preview && (
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Activité CRA</h2>
          {preview.craEntries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune activité enregistrée ce mois.</p>
          ) : (
            <>
              <CraCalendar year={preview.year} month={preview.month} entries={preview.craEntries} />
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(ENTRY_TYPE_LABELS).map(([type, label]) => {
                  const hasEntries = preview.craEntries.some((e) => e.entryType === type);
                  if (!hasEntries) return null;
                  return (
                    <span key={type} className={`text-xs px-1.5 py-0.5 rounded ${ENTRY_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Shared Weather Entries */}
      {preview && preview.reportType === 'CRA_WITH_WEATHER' && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Météo projets partagée</h2>
          {preview.weatherEntries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune météo partagée ce mois.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {preview.weatherEntries.map((w, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 text-sm">
                  <span className="text-lg leading-none" aria-hidden="true">
                    {WEATHER_ICONS[w.state] ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-gray-900">{w.projectName}</span>
                      <span className="text-gray-500 text-xs">
                        {new Date(w.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-gray-600 text-xs">{WEATHER_LABELS[w.state] ?? w.state}</span>
                    </div>
                    {w.comment && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{w.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
