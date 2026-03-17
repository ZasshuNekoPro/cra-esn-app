import Link from 'next/link';
import type { ReportProjectSummary } from '@esn/shared-types';

interface Props {
  projects: ReportProjectSummary[];
}

export function UpcomingMilestonesCard({ projects }: Props): JSX.Element {
  const projectsWithMilestones = projects.filter(
    (p) => p.milestonesDue > 0 || p.milestonesLate > 0,
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Jalons à venir</h2>
      {projectsWithMilestones.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun jalon prévu ou en retard.</p>
      ) : (
        <div className="space-y-3">
          {projectsWithMilestones.map((project) => (
            <div key={project.projectId} className="flex items-center justify-between">
              <Link
                href={`/projects/${project.projectId}/presentation`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
              >
                {project.projectName}
              </Link>
              <div className="ml-3 flex shrink-0 gap-2 text-xs">
                {project.milestonesLate > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                    {project.milestonesLate} en retard
                  </span>
                )}
                {project.milestonesDue > 0 && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">
                    {project.milestonesDue} à venir
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
