import { auth } from '../../../../../auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function getEsnAdmins() {
  const session = await auth();
  if (!session) return [];

  try {
    const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'}/users`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json() as Array<{ id: string; email: string; firstName: string; lastName: string; role: string; createdAt: string }>;
    return data.filter((u) => u.role === 'ESN_ADMIN');
  } catch {
    return [];
  }
}

export default async function PlatformDashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  const esnAdmins = await getEsnAdmins();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord — Administration plateforme</h1>
        <Link
          href="/platform/admin/users"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + Créer une ESN
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <p className="text-sm text-gray-500 mb-1">Comptes ESN enregistrés</p>
        <p className="text-3xl font-bold text-blue-600">{esnAdmins.length}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">ESN enregistrées</h2>
        </div>
        {esnAdmins.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>Aucune ESN enregistrée.</p>
            <Link href="/platform/admin/users" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Créer la première ESN →
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {esnAdmins.map((esn) => (
              <li key={esn.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{esn.firstName} {esn.lastName}</p>
                  <p className="text-sm text-gray-500">{esn.email}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">ESN Admin</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
