import type { LeaveBalanceSummary } from '@esn/shared-types';
import { LeaveType } from '@esn/shared-types';

const LEAVE_LABELS: Record<LeaveType, string> = {
  [LeaveType.PAID_LEAVE]: 'Congés payés',
  [LeaveType.RTT]:        'RTT',
  [LeaveType.SICK_LEAVE]: 'Arrêt maladie',
  [LeaveType.OTHER]:      'Autre',
};

interface Props {
  balances: LeaveBalanceSummary[];
}

export function LeaveBalanceCard({ balances }: Props): JSX.Element {
  if (balances.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Soldes de congés</h2>
        <p className="text-sm text-gray-500">Aucun solde disponible.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Soldes de congés</h2>
      <div className="space-y-3">
        {balances.map((balance) => {
          const pct = balance.totalDays > 0
            ? Math.round((balance.usedDays / balance.totalDays) * 100)
            : 0;
          return (
            <div key={balance.leaveType}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-700">{LEAVE_LABELS[balance.leaveType]}</span>
                <span className="tabular-nums text-gray-500">
                  {balance.remainingDays} restants / {balance.totalDays} total
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-blue-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
