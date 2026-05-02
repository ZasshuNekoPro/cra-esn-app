import { CraEntryType, CraEntryModifier } from '@esn/shared-types';

const TYPE_ITEMS: Array<{ type: CraEntryType; label: string; color: string }> = [
  { type: CraEntryType.WORK_ONSITE, label: 'Présentiel',  color: 'bg-blue-100' },
  { type: CraEntryType.WORK_REMOTE, label: 'Télétravail', color: 'bg-cyan-100' },
  { type: CraEntryType.LEAVE_CP,    label: 'Congés payés', color: 'bg-yellow-100' },
  { type: CraEntryType.LEAVE_RTT,   label: 'RTT',          color: 'bg-amber-100' },
  { type: CraEntryType.SICK,        label: 'Maladie',      color: 'bg-orange-100' },
];

const MODIFIER_ITEMS: Array<{ value: CraEntryModifier; label: string; icon: string }> = [
  { value: CraEntryModifier.TRAVEL,   label: 'Déplacement', icon: '✈' },
  { value: CraEntryModifier.TRAINING, label: 'Formation',   icon: '📚' },
  { value: CraEntryModifier.ON_CALL,  label: 'Astreinte',   icon: '📞' },
  { value: CraEntryModifier.OVERTIME, label: 'Heure supp.', icon: '⊕' },
];

export function EntryTypeLegend(): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {TYPE_ITEMS.map(({ type, label, color }) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              data-testid="legend-swatch"
              className={`inline-block h-3 w-3 rounded-sm border border-gray-300 ${color}`}
            />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {MODIFIER_ITEMS.map(({ value, label, icon }) => (
          <div key={value} className="flex items-center gap-1">
            <span className="text-xs">{icon}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
