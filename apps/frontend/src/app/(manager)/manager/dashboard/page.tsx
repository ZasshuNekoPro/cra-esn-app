import Link from 'next/link';
import { craApi } from '../../../../lib/api/cra';
import { missionsApi } from '../../../../lib/api/missions';
import { usersApi } from '../../../../lib/api/users';
import { Role } from '@esn/shared-types';

export default async function ManagerDashboardPage(): Promise<JSX.Element> {
  let pendingCount: number | null = null;
  let employeeCount: number | null = null;
  let activeMissionCount: number | null = null;

  const [craResult, missionsResult, usersResult] = await Promise.allSettled([
    craApi.getPendingEsn(),
    missionsApi.list(),
    usersApi.list(),
  ]);
  if (craResult.status === 'fulfilled') pendingCount = craResult.value.count;
  if (missionsResult.status === 'fulfilled') activeMissionCount = missionsResult.value.filter((m) => m.isActive).length;
  if (usersResult.status === 'fulfilled') employeeCount = usersResult.value.filter((u) => u.role === Role.EMPLOYEE).length;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de bord Gestionnaire</h1>
      <p className="text-sm text-gray-500 mb-8">Vue d&apos;ensemble de l&apos;activité</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">Salariés actifs</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{employeeCount ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">Missions en cours</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeMissionCount ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">CRA en attente de validation</p>
          <p
            className={`text-3xl font-bold mt-1 ${
              pendingCount !== null && pendingCount > 0 ? 'text-orange-600' : 'text-gray-900'
            }`}
          >
            {pendingCount ?? '—'}
          </p>
          {pendingCount !== null && pendingCount > 0 && (
            <Link
              href="/manager/cra-validation"
              className="mt-2 inline-block text-xs font-medium text-orange-600 hover:text-orange-700 underline"
            >
              Voir les CRA →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
