import { LeaveType } from '@esn/shared-types';

interface LeaveBalanceRow {
  leaveType: string;
  totalDays: number;
  usedDays: number;
}

interface LeaveBalanceSummaryProps {
  balances: LeaveBalanceRow[];
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  [LeaveType.PAID_LEAVE]: 'CP (Congés payés)',
  [LeaveType.RTT]: 'RTT',
};

const LEAVE_TYPE_ORDER = [LeaveType.PAID_LEAVE, LeaveType.RTT];

export function LeaveBalanceSummary({ balances }: LeaveBalanceSummaryProps): JSX.Element {
  const findBalance = (type: string): LeaveBalanceRow | undefined =>
    balances.find((b) => b.leaveType === type);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Consommés
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Disponibles
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Restants
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {LEAVE_TYPE_ORDER.map((leaveType) => {
            const balance = findBalance(leaveType);
            const label = LEAVE_TYPE_LABELS[leaveType] ?? leaveType;

            if (!balance) {
              return (
                <tr key={leaveType}>
                  <td className="px-4 py-3 text-sm text-gray-900">{label}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400">N/A</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-400">N/A</td>
                  <td
                    data-testid={`remaining-${leaveType}`}
                    className="px-4 py-3 text-sm text-right text-gray-400"
                  >
                    N/A
                  </td>
                </tr>
              );
            }

            const remaining = balance.totalDays - balance.usedDays;
            const isLow = remaining < 2;
            const remainingClass = isLow
              ? 'text-red-600 font-semibold'
              : 'text-gray-900';

            return (
              <tr key={leaveType}>
                <td className="px-4 py-3 text-sm text-gray-900">{label}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {balance.usedDays}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {balance.totalDays}
                </td>
                <td
                  data-testid={`remaining-${leaveType}`}
                  className={`px-4 py-3 text-sm text-right ${remainingClass}`}
                >
                  {remaining}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
