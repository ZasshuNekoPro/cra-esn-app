'use client';

import { useState, useEffect, useCallback } from 'react';
import { contextNotesClientApi } from '../../lib/api/contextNotes';
import type { ContextNote } from '../../lib/api/contextNotes';

interface Props {
  missionId: string;
}

export function ContextNotesSection({ missionId }: Props): JSX.Element {
  const [notes, setNotes] = useState<ContextNote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const load = useCallback(async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await contextNotesClientApi.list(missionId, p, PAGE_SIZE);
      setNotes(res.data);
      setTotal(res.total);
      setPage(res.page);
    } catch {
      setError('Impossible de charger les notes.');
    } finally {
      setIsLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await contextNotesClientApi.delete(id);
      await load(page);
    } catch {
      setError('Impossible de supprimer la note.');
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Notes IA
          {total > 0 && <span className="ml-2 text-xs font-normal text-gray-400">{total} note{total > 1 ? 's' : ''}</span>}
        </h3>
        <button
          onClick={() => void load(page)}
          disabled={isLoading}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Actualiser"
        >
          ↻
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {isLoading && notes.length === 0 && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">
          Aucune note IA pour cette mission.
          <br />
          <span className="text-xs">Utilisez le mode Information dans l'assistant pour en créer.</span>
        </p>
      )}

      <div className="space-y-2">
        {notes.map((note) => {
          const isExpanded = expandedId === note.id;
          const preview = note.content.length > 200 ? note.content.slice(0, 200) + '…' : note.content;

          return (
            <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                      IA
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {isExpanded ? note.content : preview}
                  </p>
                  {note.content.length > 200 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      {isExpanded ? 'Voir moins' : 'Voir plus'}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => void handleDelete(note.id)}
                  className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                  aria-label="Supprimer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => void load(page - 1)}
            disabled={page <= 1 || isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            ← Précédent
          </button>
          <span className="text-xs text-gray-400">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => void load(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
