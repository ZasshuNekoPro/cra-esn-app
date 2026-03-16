import { notFound } from 'next/navigation';
import { auth } from '../../../../../auth';
import { craApi } from '../../../../../lib/api/cra';
import { CraMonthClient } from '../../../../../components/cra/CraMonthClient';

interface PageParams {
  year: string;
  month: string;
}

interface Props {
  params: PageParams;
}

export default async function CraMonthPage({ params }: Props): Promise<JSX.Element> {
  const session = await auth();
  if (!session) {
    notFound();
  }

  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);

  if (
    isNaN(year) ||
    isNaN(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    notFound();
  }

  // Fetch or create the CRA month (server-side)
  const craMonth = await craApi.getOrCreateMonth(year, month);

  // Fetch month details with entries
  const craMonthWithEntries = await craApi.getMonth(craMonth.id);

  // Fetch summary to get public holidays
  const summary = await craApi.getSummary(craMonth.id);

  // Extract public holiday dates from summary (via entries or a separate field)
  // The summary does not include a publicHolidays field in the current type, so we
  // derive them from the entries list where entryType === HOLIDAY, or pass empty array
  // (the backend may return them in a future field). For now use empty array.
  const publicHolidayDates: string[] = [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <a
          href="/cra"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Retour à la liste
        </a>
      </div>

      {/* Summary bar */}
      <div className="mb-6 flex flex-wrap gap-4 p-4 bg-white rounded-lg border border-gray-200 text-sm">
        <span className="text-gray-600">
          Jours travaillés :{' '}
          <strong className="text-gray-900">{summary.totalWorkDays}</strong>
        </span>
        <span className="text-gray-600">
          Congés :{' '}
          <strong className="text-gray-900">{summary.totalLeaveDays}</strong>
        </span>
        <span className="text-gray-600">
          Maladie :{' '}
          <strong className="text-gray-900">{summary.totalSickDays}</strong>
        </span>
        <span className="text-gray-600">
          Ouvrables :{' '}
          <strong className="text-gray-900">{summary.workingDaysInMonth}</strong>
        </span>
        {summary.isOvertime && (
          <span className="text-red-600 font-medium">⚠ Dépassement détecté</span>
        )}
      </div>

      <CraMonthClient
        craMonth={craMonth}
        initialEntries={craMonthWithEntries.entries}
        publicHolidayDates={publicHolidayDates}
        userRole={session.user.role}
      />
    </div>
  );
}
