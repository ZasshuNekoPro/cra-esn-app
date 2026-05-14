import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { reportsApi } from '../../../lib/api/reports';
import { MonthSummaryCard } from '../../../components/reports/MonthSummaryCard';
import { ProjectsWeatherGrid } from '../../../components/reports/ProjectsWeatherGrid';
import { UpcomingMilestonesCard } from '../../../components/reports/UpcomingMilestonesCard';
import { LeaveBalanceCard } from '../../../components/reports/LeaveBalanceCard';
import { NotificationBell } from '../../../components/reports/NotificationBell';
import { ShareDashboardButton } from '../../../components/reports/ShareDashboardButton';
import { SendReportButton } from '../../../components/reports/SendReportButton';
import { SentReportsTable } from '../../../components/reports/SentReportsTable';
import { MonthNavigator } from '../../../components/reports/MonthNavigator';
import type { MonthlyReport, SentReportHistoryItem } from '@esn/shared-types';

async function getReport(year: number, month: number): Promise<MonthlyReport | null> {
  try {
    return await reportsApi.getMonthlyReport(year, month);
  } catch {
    return null;
  }
}

async function getSentHistory(): Promise<SentReportHistoryItem[]> {
  try {
    return await reportsApi.getSentHistory();
  } catch {
    return [];
  }
}

function resolveYearMonth(params: { year?: string; month?: string }): { year: number; month: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const parsedYear = params.year ? parseInt(params.year, 10) : NaN;
  const parsedMonth = params.month ? parseInt(params.month, 10) : NaN;

  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= currentYear
    ? parsedYear
    : currentYear;

  const maxMonth = year === currentYear ? currentMonth : 12;
  const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= maxMonth
    ? parsedMonth
    : (year === currentYear ? currentMonth : 12);

  return { year, month };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const { year, month } = resolveYearMonth(params);
  const [report, sentHistory] = await Promise.all([getReport(year, month), getSentHistory()]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            Rapports — {monthLabel}
          </h1>
          <p className="text-sm text-gray-500">
            Bilan mensuel et état de vos projets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthNavigator year={year} month={month} />
          <NotificationBell />
          <SendReportButton year={year} month={month} />
          <ShareDashboardButton />
        </div>
      </div>

      {/* Sent reports history */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Historique des envois
        </h2>
        <SentReportsTable items={sentHistory} />
      </div>

      {report ? (
        <>
          {/* Row 1: month summary + leave balances */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MonthSummaryCard report={report} />
            <LeaveBalanceCard balances={report.leaveBalances} />
          </div>

          {/* Row 2: weather grid + milestones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProjectsWeatherGrid projects={report.projects} />
            <UpcomingMilestonesCard projects={report.projects} />
          </div>

          {/* Project breakdown */}
          {report.projectBreakdown.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Répartition par projet
              </h2>
              <div className="space-y-2">
                {report.projectBreakdown.map((item) => (
                  <div key={item.projectId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.projectName}</span>
                    <span className="tabular-nums font-medium text-gray-900">
                      {item.days} jour{item.days > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Aucun rapport disponible pour ce mois. Créez d'abord votre CRA.
          </p>
        </div>
      )}
    </div>
  );
}
