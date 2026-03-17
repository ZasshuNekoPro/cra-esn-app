import { DocumentType } from '@esn/shared-types';
import type { DocumentWithRelations } from '../../lib/api/documents';

const TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.CONTRACT]: 'Contrat',
  [DocumentType.AMENDMENT]: 'Avenant',
  [DocumentType.MISSION_ORDER]: 'Ordre de mission',
  [DocumentType.CRA_PDF]: 'CRA PDF',
  [DocumentType.OTHER]: 'Autre',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface DocumentCardProps {
  document: DocumentWithRelations;
  onDownload: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentCard({ document, onDownload, onShare, onDelete }: DocumentCardProps) {
  const latestVersion = document.versions.at(-1);
  const activeShares = document.shares.filter((s) => !s.revokedAt);

  return (
    <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{document.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {TYPE_LABELS[document.type]}
          </span>
          {latestVersion && latestVersion.version > 1 && (
            <span className="text-xs text-gray-400">v{latestVersion.version}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>{document.mimeType.split('/')[1]?.toUpperCase()}</span>
          <span>{formatBytes(document.sizeBytes)}</span>
          {activeShares.length > 0 && (
            <span className="text-indigo-500">
              Partagé avec {activeShares.length} utilisateur{activeShares.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onDownload(document.id)}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
        >
          Télécharger
        </button>
        {onShare && document.type !== DocumentType.CRA_PDF && (
          <button
            onClick={() => onShare(document.id)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            Partager
          </button>
        )}
        {onDelete && document.type !== DocumentType.CRA_PDF && (
          <button
            onClick={() => onDelete(document.id)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
