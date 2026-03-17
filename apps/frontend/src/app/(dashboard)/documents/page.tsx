import { documentsApi } from '../../../lib/api/documents';
import { DocumentsPanel } from '../../../components/documents/DocumentsPanel';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ missionId?: string }>;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const documents = await documentsApi
    .list({ missionId: params.missionId })
    .catch(() => []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mes documents</h1>
      <DocumentsPanel
        initialDocuments={documents}
        missionId={params.missionId ?? ''}
      />
    </div>
  );
}
