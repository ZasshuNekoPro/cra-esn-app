import { ProjectStatus } from '@esn/shared-types';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; class: string }> = {
  [ProjectStatus.ACTIVE]: { label: 'Actif', class: 'bg-green-100 text-green-800' },
  [ProjectStatus.PAUSED]: { label: 'Pausé', class: 'bg-yellow-100 text-yellow-800' },
  [ProjectStatus.CLOSED]: { label: 'Fermé', class: 'bg-gray-100 text-gray-500' },
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export function ProjectStatusBadge({ status, size = 'sm' }: ProjectStatusBadgeProps): JSX.Element {
  const cfg = STATUS_CONFIG[status];
  const sizeClass = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span className={`rounded-full font-medium ${sizeClass} ${cfg.class}`}>
      {cfg.label}
    </span>
  );
}
