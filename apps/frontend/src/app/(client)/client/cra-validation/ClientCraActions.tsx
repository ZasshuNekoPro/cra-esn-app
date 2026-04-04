'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApiClient } from '../../../../lib/api/clientFetch';

interface Props {
  craMonthId: string;
}

export function ClientCraActions({ craMonthId }: Props): JSX.Element {
  const router = useRouter();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState<'sign' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async (): Promise<void> => {
    setLoading('sign');
    setError(null);
    try {
      await clientApiClient.post(`/cra/months/${craMonthId}/sign-client`);
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Erreur lors de la signature.');
      setLoading(null);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!comment.trim()) {
      setError('Un commentaire est requis pour refuser un CRA.');
      return;
    }
    setLoading('reject');
    setError(null);
    try {
      await clientApiClient.post(`/cra/months/${craMonthId}/reject-client`, { comment: comment.trim() });
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Erreur lors du refus.');
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { void handleSign(); }}
          disabled={loading !== null}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {loading === 'sign' ? 'Signature…' : 'Signer'}
        </button>
        <button
          type="button"
          onClick={() => { setShowRejectModal(true); setError(null); }}
          disabled={loading !== null}
          className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-60"
        >
          Refuser
        </button>
      </div>

      {error && !showRejectModal && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Refuser le CRA</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label htmlFor={`reject-comment-${craMonthId}`} className="block text-sm font-medium text-gray-700">
                Motif du refus <span className="text-red-500">*</span>
              </label>
              <textarea
                id={`reject-comment-${craMonthId}`}
                value={comment}
                onChange={(e) => { setComment(e.target.value); }}
                rows={4}
                placeholder="Expliquez le motif du refus..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setComment(''); setError(null); }}
                disabled={loading === 'reject'}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => { void handleReject(); }}
                disabled={loading === 'reject'}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading === 'reject' ? 'Envoi…' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
