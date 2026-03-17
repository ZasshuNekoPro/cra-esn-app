import { notFound } from 'next/navigation';
import { apiClient } from '../../../lib/api/client';
import type { PublicDashboard } from '@esn/shared-types';
import { WeatherIcon } from '../../../components/projects/WeatherIcon';

interface Props {
  params: { token: string };
}

async function getPublicDashboard(token: string): Promise<PublicDashboard | null> {
  try {
    return await apiClient.get<PublicDashboard>(`/reports/shared/${token}`);
  } catch {
    return null;
  }
}

const MONTH_NAMES = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default async function SharedDashboardPage({ params }: Props): Promise<JSX.Element> {
  const dashboard = await getPublicDashboard(params.token);

  if (!dashboard) notFound();

  const expiresAt = new Date(dashboard.expiresAt);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="text-lg font-bold text-blue-600">ESN CRA</p>
          <p className="text-xs text-gray-400">
            Lien valide jusqu'au {expiresAt.toLocaleString('fr-FR')}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Employee intro */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dashboard.employeeName}</h1>
          <p className="text-gray-500">{dashboard.missionTitle}</p>
        </div>

        {/* Current month summary */}
        {dashboard.currentMonth && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {MONTH_NAMES[dashboard.currentMonth.month] ?? ''} {dashboard.currentMonth.year}
            </h2>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboard.currentMonth.totalWorkDays}
                </p>
                <p className="text-gray-500">jours saisis</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut CRA</p>
                <p className="font-medium text-gray-900">{dashboard.currentMonth.craStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        {dashboard.projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Projets</h2>
            {dashboard.projects.map((project) => (
              <div
                key={project.projectId}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{project.projectName}</h3>
                  {project.latestWeatherState && (
                    <WeatherIcon state={project.latestWeatherState} showLabel size="sm" />
                  )}
                </div>

                {project.upcomingMilestones.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Jalons à venir
                    </p>
                    {project.upcomingMilestones.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{m.title}</span>
                        {m.dueDate && (
                          <span className="text-gray-400">
                            {new Date(m.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Tableau de bord partagé — données filtrées · Généré par ESN CRA App
        </p>
      </main>
    </div>
  );
}
