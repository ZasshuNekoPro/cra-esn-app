import { notFound } from 'next/navigation';
import Link from 'next/link';
import { projectsApi } from '../../../../lib/api/projects';
import { WeatherIcon } from '../../../../components/projects/WeatherIcon';
import { ProjectStatus, MilestoneStatus, ValidationStatus } from '@esn/shared-types';

const STATUS_LABELS: Record<ProjectStatus, { label: string; class: string }> = {
  [ProjectStatus.ACTIVE]: { label: 'Actif', class: 'bg-green-100 text-green-800' },
  [ProjectStatus.PAUSED]: { label: 'Pausé', class: 'bg-yellow-100 text-yellow-800' },
  [ProjectStatus.CLOSED]: { label: 'Fermé', class: 'bg-gray-100 text-gray-500' },
};

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, { label: string; class: string }> = {
  [MilestoneStatus.PLANNED]:     { label: 'Planifié',    class: 'bg-blue-100 text-blue-700' },
  [MilestoneStatus.IN_PROGRESS]: { label: 'En cours',    class: 'bg-yellow-100 text-yellow-700' },
  [MilestoneStatus.DONE]:        { label: 'Terminé',     class: 'bg-green-100 text-green-700' },
  [MilestoneStatus.LATE]:        { label: 'En retard',   class: 'bg-red-100 text-red-700' },
  [MilestoneStatus.ARCHIVED]:    { label: 'Archivé',     class: 'bg-gray-100 text-gray-500' },
};

interface ProjectDetailPageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps): Promise<JSX.Element> {
  const project = await projectsApi.get(params.id).catch(() => null);

  if (!project) {
    notFound();
  }

  const statusCfg = STATUS_LABELS[project.status];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
              ← Projets
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.class}`}>
              {statusCfg.label}
            </span>
            <span className="text-sm text-gray-500">
              Depuis le {new Date(project.startDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        <div className="text-right">
          {project.weatherHistory.length > 0 && (
            <WeatherIcon
              state={project.weatherHistory[0].state}
              size="lg"
              showLabel
            />
          )}
        </div>
      </div>

      {/* Pending validations alert */}
      {project.pendingValidations.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-800">
            {project.pendingValidations.length} demande{project.pendingValidations.length > 1 ? 's' : ''} de validation en attente
          </p>
        </div>
      )}

      {/* Weather history */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Météo récente</h2>
        {project.weatherHistory.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune entrée météo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {project.weatherHistory.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                title={entry.comment ?? undefined}
              >
                <WeatherIcon state={entry.state} size="sm" />
                <span className="text-xs text-gray-600">
                  {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Milestones */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Jalons</h2>
        {project.milestones.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun jalon défini.</p>
        ) : (
          <div className="space-y-2">
            {project.milestones.map((milestone) => {
              const msCfg = MILESTONE_STATUS_LABELS[milestone.status];
              return (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                    {milestone.dueDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Échéance : {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msCfg.class}`}>
                    {msCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Validation requests */}
      {project.pendingValidations.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Validations en attente</h2>
          <div className="space-y-2">
            {project.pendingValidations.map((val) => (
              <div
                key={val.id}
                className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{val.title}</p>
                  <p className="text-xs text-gray-500">{val.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                  {val.status === ValidationStatus.PENDING ? 'En attente' : val.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
