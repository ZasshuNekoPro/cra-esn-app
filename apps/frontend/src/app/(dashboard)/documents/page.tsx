import { missionsApi } from '../../../lib/api/missions';
import { documentsApi } from '../../../lib/api/documents';
import { DocumentsPanel } from '../../../components/documents/DocumentsPanel';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ missionId?: string }>;
}): Promise<JSX.Element> {
  const params = await searchParams;

  const [missions, documents] = await Promise.all([
    missionsApi.list().catch(() => []),
    documentsApi.list({ missionId: params.missionId }).catch(() => []),
  ]);

  const activeMissions = missions.filter(
    (m) => m.isActive || (m.endDate && new Date(m.endDate) > new Date(Date.now() - 30 * 86400_000)),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes documents</h1>

      {/* Mission docspaces */}
      {activeMissions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Espaces documentaires de missions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeMissions.map((m) => (
              <a
                key={m.id}
                href={`/documents/${m.id}`}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.isActive ? 'En cours' : 'Terminée récemment'}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 ml-3 transition-colors"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* General documents */}
      <div>
        {activeMissions.length > 0 && (
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Autres documents
          </h2>
        )}
        <DocumentsPanel
          initialDocuments={documents}
          missionId={params.missionId}
        />
      </div>
    </div>
  );
}
