import { MilestoneStatus } from '@esn/shared-types';
import type { Milestone } from '@esn/shared-types';

interface ProjectProgressBarProps {
  milestones: Milestone[];
}

export function ProjectProgressBar({ milestones }: ProjectProgressBarProps): JSX.Element {
  const total = milestones.filter((m) => m.status !== MilestoneStatus.ARCHIVED).length;
  const done = milestones.filter((m) => m.status === MilestoneStatus.DONE).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{done}/{total} jalons terminés</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
