import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';

export default async function ClientDashboardPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {session.user.firstName} {session.user.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenue sur votre espace client. Consultez les CRA, projets, documents et rapports qui vous sont partagés.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/client/cra-validation', label: 'Validation CRA', desc: 'CRA en attente de signature', color: 'blue' },
          { href: '/client/projects', label: 'Projets', desc: 'Projets liés à vos missions', color: 'green' },
          { href: '/client/documents', label: 'Documents', desc: 'Documents partagés avec vous', color: 'purple' },
          { href: '/client/reports', label: 'Rapports', desc: 'Bilans mensuels à valider', color: 'orange' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white rounded-lg border p-5 hover:shadow-md transition-shadow"
          >
            <p className="font-semibold text-gray-900">{item.label}</p>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
