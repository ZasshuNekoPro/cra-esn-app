import { documentsApi } from '../../../../lib/api/documents';

export default async function ClientDocumentsPage(): Promise<JSX.Element> {
  const documents = await documentsApi.listSharedWithMe().catch(() => []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Documents partagés avec vous par vos salariés.</p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          <p className="font-medium mb-1">Aucun document partagé</p>
          <p className="text-sm">Les documents partagés par vos salariés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y">
          {documents.map((doc) => {
            const latestVersion = doc.versions?.[0];
            return (
              <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doc.type}
                    {latestVersion && (
                      <span className="ml-2">
                        · v{latestVersion.version}
                        · {(latestVersion.sizeBytes / 1024).toFixed(0)} Ko
                      </span>
                    )}
                  </p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Télécharger
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
