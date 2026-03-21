import type { SentReportHistoryItem } from '@esn/shared-types';

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
            <th className="pb-3">Destinataires</th>
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
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {recipientsLabel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
