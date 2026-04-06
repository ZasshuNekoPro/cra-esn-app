import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { esnApi } from '../../../../../lib/api/esn';
import type { PlatformStats } from '@esn/shared-types';

async function getStats(): Promise<PlatformStats | null> {
  const session = await auth();
  if (!session) return null;
  try {
    return await esnApi.getStats();
  } catch {
    return null;
  }
}

export default async function PlatformDashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  const stats = await getStats();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord — Administration plateforme</h1>
        <div className="flex gap-3">
          <Link
            href="/platform/admin/esn"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Créer une ESN
          </Link>
          <Link
            href="/platform/admin/users"
            className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-900"
          >
            + Créer un compte
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">ESN enregistrées</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.esnCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Comptes ESN Admin</p>
          <p className="text-3xl font-bold text-indigo-600">{stats?.esnAdminCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Salariés</p>
          <p className="text-3xl font-bold text-green-600">{stats?.employeeCount ?? '—'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Clients</p>
          <p className="text-3xl font-bold text-orange-600">{stats?.clientCount ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">ESN enregistrées</h2>
          <Link href="/platform/admin/esn" className="text-sm text-blue-600 hover:underline">
            Gérer →
          </Link>
        </div>
        {!stats || stats.esnList.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Aucune ESN enregistrée.</p>
            <Link href="/platform/admin/esn" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Créer la première ESN →
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {stats.esnList.map((esn) => (
              <div key={esn.id} className="px-6 py-4 flex items-center justify-between">
                <p className="font-medium text-gray-900">{esn.name}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{esn.adminCount} admin{esn.adminCount > 1 ? 's' : ''}</span>
                  <span>{esn.employeeCount} salarié{esn.employeeCount > 1 ? 's' : ''}</span>
                  <span>{esn.clientCount} client{esn.clientCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
