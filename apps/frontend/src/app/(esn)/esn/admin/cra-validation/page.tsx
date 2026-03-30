import { craApi } from '../../../../../lib/api/cra';
import { CraValidationActions } from './CraValidationActions';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default async function CraValidationPage(): Promise<JSX.Element> {
  const { items } = await craApi.getPendingEsn();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Validation des CRA</h1>
      <p className="text-sm text-gray-500 mb-8">
        CRA en attente de votre validation ({items.length})
      </p>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
          <p className="text-sm">Aucun CRA en attente de validation.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Salarié</th>
                <th className="px-6 py-3">Période</th>
                <th className="px-6 py-3">Soumis le</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const periodLabel = `${MONTH_NAMES[(item.month - 1)] ?? item.month} ${item.year}`;
                const submittedAt = new Date(item.submittedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });

                return (
                  <tr key={item.craMonthId} className="text-gray-700">
                    <td className="px-6 py-4 font-medium">{item.employeeName}</td>
                    <td className="px-6 py-4 capitalize">{periodLabel}</td>
                    <td className="px-6 py-4 tabular-nums text-gray-500">{submittedAt}</td>
                    <td className="px-6 py-4">
                      <CraValidationActions craMonthId={item.craMonthId} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
