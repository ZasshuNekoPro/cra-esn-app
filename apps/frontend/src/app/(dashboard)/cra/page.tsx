import Link from 'next/link';

export default function CraListPage(): JSX.Element {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Placeholder: previous months list (real data will be fetched in T4)
  const previousMonths: Array<{ year: number; month: number }> = [];
  for (let i = 1; i <= 5; i++) {
    let y = currentYear;
    let m = currentMonth - i;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    previousMonths.push({ year: y, month: m });
  }

  const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes CRA</h1>

      {/* Current month CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <p className="text-sm text-blue-600 font-medium mb-1">Mois en cours</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </h2>
        <Link
          href={`/cra/${currentYear}/${currentMonth}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Saisir mon CRA
        </Link>
      </div>

      {/* Previous months placeholder */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Mois précédents
        </h2>
        <div className="space-y-2">
          {previousMonths.map(({ year, month }) => (
            <Link
              key={`${year}-${month}`}
              href={`/cra/${year}/${month}`}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-800">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <span className="text-xs text-gray-400">Voir →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
