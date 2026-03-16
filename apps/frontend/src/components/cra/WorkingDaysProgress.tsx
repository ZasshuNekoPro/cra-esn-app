interface WorkingDaysProgressProps {
  filledDays: number;
  workingDays: number;
  isOvertime: boolean;
}

export function WorkingDaysProgress({
  filledDays,
  workingDays,
  isOvertime,
}: WorkingDaysProgressProps): JSX.Element {
  const percentage =
    workingDays > 0 ? Math.min(Math.round((filledDays / workingDays) * 100), 100) : 0;

  const barColor = isOvertime ? 'bg-red-500' : 'bg-blue-500';
  const labelColor = isOvertime ? 'text-red-600 font-semibold' : 'text-gray-700';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Jours saisis</span>
        <span className={`text-sm ${labelColor}`}>
          {filledDays} / {workingDays} jours
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative w-full h-3 rounded-full overflow-hidden ${isOvertime ? 'bg-red-500' : 'bg-gray-200'}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isOvertime && (
        <p className="text-xs text-red-600 font-medium">
          Attention : heures supplémentaires détectées
        </p>
      )}
    </div>
  );
}
