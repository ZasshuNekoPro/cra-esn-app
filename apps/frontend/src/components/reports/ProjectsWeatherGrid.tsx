import Link from 'next/link';
import type { ReportProjectSummary } from '@esn/shared-types';
import { WeatherIcon } from '../projects/WeatherIcon';

interface Props {
  projects: ReportProjectSummary[];
}

export function ProjectsWeatherGrid({ projects }: Props): JSX.Element {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Météo projets</h2>
        <p className="text-sm text-gray-500">Aucun projet actif ce mois-ci.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Météo projets</h2>
      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.projectId} className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {project.latestWeatherState ? (
                <WeatherIcon state={project.latestWeatherState} size="sm" />
              ) : (
                <span className="text-lg text-gray-300">—</span>
              )}
              <Link
                href={`/projects/${project.projectId}`}
                className="truncate text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                {project.projectName}
              </Link>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2 text-xs text-gray-500">
              {project.milestonesLate > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                  {project.milestonesLate} en retard
                </span>
              ) : project.milestonesDue > 0 ? (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">
                  {project.milestonesDue} à venir
                </span>
              ) : null}
              <Link
                href={`/projects/${project.projectId}/presentation`}
                className="text-blue-600 hover:text-blue-700"
              >
                Voir →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
