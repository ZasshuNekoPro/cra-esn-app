import Link from 'next/link';
import { auth } from '../../../auth';
import { craApi } from '../../../lib/api/cra';
import { WorkingDaysProgress } from '../../../components/cra/WorkingDaysProgress';
import { LeaveBalanceSummary } from '../../../components/cra/LeaveBalanceSummary';
import { MonthStatusTimeline } from '../../../components/cra/MonthStatusTimeline';
import type { CraMonth, CraMonthSummary } from '@esn/shared-types';

async function getCurrentMonthCraData(): Promise<{
  month: CraMonth;
  summary: CraMonthSummary;
} | null> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const craMonth = await craApi.getOrCreateMonth(year, month);
    const summary = await craApi.getSummary(craMonth.id);
    return { month: craMonth, summary };
  } catch {
    return null;
  }
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  const craData = await getCurrentMonthCraData();

  const now = new Date();
  const monthLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {session?.user.firstName} !
        </h1>
        <p className="text-gray-500">
          Bienvenue sur votre tableau de bord CRA.
        </p>
      </div>

      {/* CRA widgets */}
      {craData ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Working days progress */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900 capitalize">
              Jours saisis — {monthLabel}
            </h2>
            <WorkingDaysProgress
              filledDays={craData.summary.totalWorkDays}
              workingDays={craData.summary.workingDaysInMonth}
              isOvertime={craData.summary.isOvertime}
            />
          </div>

          {/* Leave balance summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Soldes de congés
            </h2>
            <LeaveBalanceSummary balances={craData.summary.leaveBalances} />
          </div>

          {/* Month status timeline — full width */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-gray-900 capitalize">
              Statut du CRA — {monthLabel}
            </h2>
            <MonthStatusTimeline
              status={craData.month.status}
              signedByEmployeeAt={
                craData.month.signedByEmployeeAt
                  ? String(craData.month.signedByEmployeeAt)
                  : null
              }
              signedByEsnAt={
                craData.month.signedByEsnAt
                  ? String(craData.month.signedByEsnAt)
                  : null
              }
              signedByClientAt={
                craData.month.signedByClientAt
                  ? String(craData.month.signedByClientAt)
                  : null
              }
              rejectionComment={craData.month.rejectionComment ?? null}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Aucune donnée CRA disponible pour ce mois.
          </p>
          <Link
            href="/cra"
            className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Créer mon CRA
          </Link>
        </div>
      )}
    </div>
  );
}
