import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../../../auth';
import { reportsApi } from '../../../../../lib/api/reports';
import { WeatherLineChart } from '../../../../../components/reports/WeatherLineChart';
import { DaysBarChart } from '../../../../../components/reports/DaysBarChart';
import { MilestonesProgress } from '../../../../../components/reports/MilestonesProgress';
import { PresentationDateFilter } from '../../../../../components/reports/PresentationDateFilter';

interface Props {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}

export default async function ProjectPresentationPage({
  params,
  searchParams,
}: Props): Promise<JSX.Element> {
  const session = await auth();
  if (!session) notFound();

  const { from, to } = searchParams;

  const presentation = await reportsApi
    .getProjectPresentation(params.id, from, to)
    .catch(() => null);

  if (!presentation) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/projects" className="hover:text-gray-700">Projets</Link>
        <span>/</span>
        <Link href={`/projects/${params.id}`} className="hover:text-gray-700">
          {presentation.projectName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Présentation</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{presentation.projectName}</h1>
          {presentation.description && (
            <p className="mt-1 text-sm text-gray-500">{presentation.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Début : {new Date(presentation.startDate).toLocaleDateString('fr-FR')}</span>
            {presentation.endDate && (
              <span>Fin : {new Date(presentation.endDate).toLocaleDateString('fr-FR')}</span>
            )}
            {presentation.estimatedDays !== null && (
              <span>Estimation : {presentation.estimatedDays} j</span>
            )}
            <span className="font-medium text-gray-700">
              Consommé : {presentation.totalDaysSpent} j
            </span>
          </div>
        </div>

        {/* Date filter — client component */}
        <PresentationDateFilter
          projectId={params.id}
          currentFrom={from ?? null}
          currentTo={to ?? null}
        />
      </div>

      {/* Weather history */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Historique météo</h2>
        <WeatherLineChart data={presentation.weatherHistory} />
      </div>

      {/* Days by month */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Jours par mois</h2>
        <DaysBarChart data={presentation.daysByMonth} />
      </div>

      {/* Milestones */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Jalons</h2>
        <MilestonesProgress
          milestones={presentation.milestones}
          doneCount={presentation.milestoneDoneCount}
          totalCount={presentation.milestoneTotalCount}
        />
      </div>
    </div>
  );
}
