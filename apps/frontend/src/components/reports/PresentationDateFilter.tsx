'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  projectId: string;
  currentFrom: string | null;
  currentTo: string | null;
}

export function PresentationDateFilter({ projectId, currentFrom, currentTo }: Props): JSX.Element {
  const router = useRouter();
  const [from, setFrom] = useState(currentFrom ?? '');
  const [to, setTo] = useState(currentTo ?? '');

  const handleApply = (): void => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    router.push(`/projects/${projectId}/presentation${qs ? `?${qs}` : ''}`);
  };

  const handleReset = (): void => {
    setFrom('');
    setTo('');
    router.push(`/projects/${projectId}/presentation`);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Début</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Fin</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={handleApply}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Filtrer
      </button>
      {(currentFrom ?? currentTo) && (
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
