import Link from 'next/link';
import { projectsApi } from '../../../lib/api/projects';
import { WeatherIcon } from '../../../components/projects/WeatherIcon';
import { ProjectStatus, WeatherState } from '@esn/shared-types';

const STATUS_LABELS: Record<ProjectStatus, { label: string; class: string }> = {
  [ProjectStatus.ACTIVE]: { label: 'Actif', class: 'bg-green-100 text-green-800' },
  [ProjectStatus.PAUSED]: { label: 'Pausé', class: 'bg-yellow-100 text-yellow-800' },
  [ProjectStatus.CLOSED]: { label: 'Fermé', class: 'bg-gray-100 text-gray-500' },
};

export default async function ProjectsPage(): Promise<JSX.Element> {
  const projects = await projectsApi.list().catch(() => []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes projets</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nouveau projet
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium mb-1">Aucun projet pour le moment</p>
          <p className="text-sm">Créez votre premier projet lié à une mission active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const statusCfg = STATUS_LABELS[project.status];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.class}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Démarré le {new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
                    {project.milestoneCount > 0 && (
                      <span>
                        {project.milestoneCount} jalon{project.milestoneCount > 1 ? 's' : ''}
                        {project.lateMilestoneCount > 0 && (
                          <span className="ml-1 text-red-500 font-medium">
                            ({project.lateMilestoneCount} en retard)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {project.latestWeather ? (
                    <WeatherIcon state={project.latestWeather.state} size="md" />
                  ) : (
                    <WeatherIcon state={WeatherState.SUNNY} size="md" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
