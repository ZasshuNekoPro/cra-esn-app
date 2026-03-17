import type { MilestoneItem } from '@esn/shared-types';
import { MilestoneStatus } from '@esn/shared-types';

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  [MilestoneStatus.PLANNED]:     'Planifié',
  [MilestoneStatus.IN_PROGRESS]: 'En cours',
  [MilestoneStatus.DONE]:        'Terminé',
  [MilestoneStatus.LATE]:        'En retard',
  [MilestoneStatus.ARCHIVED]:    'Archivé',
};

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  [MilestoneStatus.PLANNED]:     'bg-gray-100 text-gray-600',
  [MilestoneStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
  [MilestoneStatus.DONE]:        'bg-green-100 text-green-700',
  [MilestoneStatus.LATE]:        'bg-red-100 text-red-700',
  [MilestoneStatus.ARCHIVED]:    'bg-gray-100 text-gray-400',
};

interface Props {
  milestones: MilestoneItem[];
  doneCount: number;
  totalCount: number;
}

export function MilestonesProgress({ milestones, doneCount, totalCount }: Props): JSX.Element {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-600">Avancement</span>
          <span className="font-medium text-gray-900">{doneCount} / {totalCount} jalons</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">{pct}%</p>
      </div>

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun jalon défini</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{m.title}</p>
                {m.dueDate && (
                  <p className={`text-xs ${m.isLate ? 'font-medium text-red-600' : 'text-gray-400'}`}>
                    Échéance : {new Date(m.dueDate).toLocaleDateString('fr-FR')}
                    {m.isLate && ' — EN RETARD'}
                  </p>
                )}
              </div>
              <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                {STATUS_LABELS[m.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
