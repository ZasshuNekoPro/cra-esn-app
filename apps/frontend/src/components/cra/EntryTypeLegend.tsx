import { CraEntryType } from '@esn/shared-types';

const LEGEND_ITEMS: Array<{ type: CraEntryType; label: string; color: string }> = [
  { type: CraEntryType.WORK_ONSITE, label: 'Présentiel', color: 'bg-blue-100' },
  { type: CraEntryType.WORK_REMOTE, label: 'Télétravail', color: 'bg-cyan-100' },
  { type: CraEntryType.WORK_TRAVEL, label: 'Déplacement', color: 'bg-sky-100' },
  { type: CraEntryType.LEAVE_CP, label: 'Congés payés', color: 'bg-yellow-100' },
  { type: CraEntryType.LEAVE_RTT, label: 'RTT', color: 'bg-amber-100' },
  { type: CraEntryType.SICK, label: 'Maladie', color: 'bg-orange-100' },
  { type: CraEntryType.TRAINING, label: 'Formation', color: 'bg-indigo-100' },
];

export function EntryTypeLegend(): JSX.Element {
  return (
    <div className="flex flex-wrap gap-3">
      {LEGEND_ITEMS.map(({ type, label, color }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            data-testid="legend-swatch"
            className={`inline-block h-3 w-3 rounded-sm border border-gray-300 ${color}`}
          />
          <span className="text-xs text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}
