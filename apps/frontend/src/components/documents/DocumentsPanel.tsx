'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentCard } from './DocumentCard';
import { UploadDropzone } from './UploadDropzone';
import { documentsApi } from '../../lib/api/documents';
import type { DocumentWithRelations } from '../../lib/api/documents';

interface DocumentsPanelProps {
  initialDocuments: DocumentWithRelations[];
  missionId: string;
  projectId?: string;
}

export function DocumentsPanel({ initialDocuments, missionId, projectId }: DocumentsPanelProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const updated = await documentsApi.list({ missionId });
      setDocuments(updated);
    } catch {
      // Keep existing state on refresh failure
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

  function handleUploaded() {
    setShowUpload(false);
    void refresh();
    router.refresh();
  }

  return (
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
        <UploadDropzone missionId={missionId} projectId={projectId} onUploaded={handleUploaded} />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
