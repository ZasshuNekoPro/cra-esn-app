'use client';

import { useState } from 'react';
import type { RagSource } from '@esn/shared-types';

const SOURCE_TYPE_LABELS: Record<string, string> = {
  cra_entry: 'Entrée CRA',
  cra_month: 'Bilan mensuel',
  project_comment: 'Commentaire projet',
  weather_entry: 'Météo projet',
  milestone: 'Jalon',
  document: 'Document',
};

interface Props {
  sources: RagSource[];
}

export function SourcesAccordion({ sources }: Props): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>{open ? '▼' : '▶'}</span>
        <span>
          {sources.length} source{sources.length > 1 ? 's' : ''}
        </span>
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {sources.map((source, i) => (
            <li key={`${source.sourceId}-${i}`} className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">
                {SOURCE_TYPE_LABELS[source.sourceType] ?? source.sourceType}
              </span>
              {source.date && (
                <span className="ml-1 text-gray-400">({source.date})</span>
              )}
              <p className="text-gray-400 mt-0.5 line-clamp-2">{source.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
