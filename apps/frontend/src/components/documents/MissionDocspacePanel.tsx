'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentCard } from './DocumentCard';
import { DocumentMetadataDrawer } from './DocumentMetadataDrawer';
import { UploadDropzone } from './UploadDropzone';
import { ContextNotesSection } from './ContextNotesSection';
import { documentsApi } from '../../lib/api/documents';
import { missionsClientApi } from '../../lib/api/missions';
import type { DocumentWithRelations } from '../../lib/api/documents';

interface Props {
  missionId: string;
  missionTitle: string;
  initialDocuments: DocumentWithRelations[];
  ragEnabled: boolean;
  isPrimaryEmployee: boolean;
}

export function MissionDocspacePanel({
  missionId,
  missionTitle,
  initialDocuments,
  ragEnabled: initialRagEnabled,
  isPrimaryEmployee,
}: Props): JSX.Element {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [ragEnabled, setRagEnabled] = useState(initialRagEnabled);
  const [isTogglingRag, setIsTogglingRag] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaDocId, setMetaDocId] = useState<string | null>(null);

  const metaDoc = documents.find((d) => d.id === metaDocId);

  const refresh = useCallback(async () => {
    try {
      const updated = await documentsApi.list({ missionId });
      setDocuments(updated);
    } catch {
      // Keep existing state
    }
  }, [missionId]);

  async function handleDownload(id: string) {
    try {
      const { url } = await documentsApi.getDownloadUrl(id);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de téléchargement');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await documentsApi.delete(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  }

  async function handleToggleRag() {
    setIsTogglingRag(true);
    setError(null);
    try {
      await missionsClientApi.toggleRag(missionId, !ragEnabled);
      setRagEnabled((v) => !v);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du changement');
    } finally {
      setIsTogglingRag(false);
    }
  }

  function handleUploaded() {
    setShowUpload(false);
    void refresh();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* RAG toggle (primary employee only) */}
      {isPrimaryEmployee && (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-gray-900">Assistant IA sur cet espace</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {ragEnabled
                ? 'Activé — vous pouvez interroger les documents dans l\'assistant'
                : 'Désactivé — les documents ne sont pas accessibles via l\'assistant'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggleRag()}
            disabled={isTogglingRag}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              ragEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            aria-pressed={ragEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                ragEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Documents section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Documents</h2>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="text-xs px-3 py-1.5 font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
          >
            {showUpload ? 'Annuler' : '+ Ajouter'}
          </button>
        </div>

        {showUpload && (
          <UploadDropzone missionId={missionId} onUploaded={handleUploaded} />
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun document pour le moment</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDownload={(id) => void handleDownload(id)}
                onDelete={(id) => void handleDelete(id)}
                onMetadata={(id) => setMetaDocId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context notes section */}
      {ragEnabled && (
        <div className="border-t border-gray-100 pt-6">
          <ContextNotesSection missionId={missionId} />
        </div>
      )}

      {/* Metadata drawer */}
      {metaDocId && metaDoc && (
        <DocumentMetadataDrawer
          documentId={metaDocId}
          documentName={metaDoc.name}
          isOpen={!!metaDocId}
          onClose={() => setMetaDocId(null)}
        />
      )}
    </div>
  );
}
