import type { DocumentVersion } from '@esn/shared-types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface VersionHistoryProps {
  versions: DocumentVersion[];
}

export function VersionHistory({ versions }: VersionHistoryProps) {
  if (versions.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Historique des versions
      </h3>
      <div className="space-y-1">
        {[...versions].reverse().map((v) => (
          <div key={v.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-xs text-gray-600">
            <span className="font-medium">v{v.version}</span>
            <span>{formatBytes(v.sizeBytes)}</span>
            <span>{new Date(v.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
