'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportsApi } from '../../../../../lib/api/reports';

interface Props {
  id: string;
}

export function ValidationActions({ id }: Props): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState<'archive' | 'remind' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: 'archive' | 'remind'): Promise<void> {
    setLoading(action);
    setError(null);
    try {
      if (action === 'archive') {
        await reportsApi.archiveValidation(id);
      } else {
        await reportsApi.remindValidation(id);
      }
      router.refresh();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(null);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={() => void handle('remind')}
        disabled={loading !== null}
        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {loading === 'remind' ? '...' : 'Relancer'}
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => void handle('archive')}
        disabled={loading !== null}
        className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:opacity-50"
      >
        {loading === 'archive' ? '...' : 'Archiver'}
      </button>
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </span>
  );
}
