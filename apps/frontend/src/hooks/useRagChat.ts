'use client';

import { useState, useCallback, useRef } from 'react';
import type { RagSource, ConversationTurn } from '@esn/shared-types';
import { streamRagQuery } from '../lib/api/rag';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[];
  comparison?: string;
  noteSavedId?: string;
  isStreaming?: boolean;
}

interface UseRagChatOptions {
  missionId?: string;
  mode?: 'question' | 'information';
}

export function useRagChat(accessToken: string, opts: UseRagChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      if (!accessToken || isLoading) return;

      // Abort any in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      setIsLoading(true);

      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', content: question },
        { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
      ]);

      const history: ConversationTurn[] = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        for await (const event of streamRagQuery(
          {
            question,
            messages: history,
            mode: opts.mode,
            filters: opts.missionId ? { missionId: opts.missionId } : undefined,
          },
          accessToken,
          controller.signal,
        )) {
          if (controller.signal.aborted) break;

          if (event.type === 'token') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.content }
                  : m,
              ),
            );
          } else if (event.type === 'sources') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, sources: event.sources } : m,
              ),
            );
          } else if (event.type === 'comparison') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, comparison: event.content } : m,
              ),
            );
          } else if (event.type === 'note_saved') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, noteSavedId: event.noteId } : m,
              ),
            );
          } else if (event.type === 'done' || event.type === 'error') {
            if (event.type === 'error') {
              setError(event.message ?? 'Une erreur est survenue lors de la génération.');
            }
            break;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError('Impossible de contacter l\'assistant. Vérifiez votre connexion.');
        }
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsLoading(false);
      }
    },
    [accessToken, isLoading, messages, opts.missionId, opts.mode],
  );

  const clearHistory = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  }, []);

  return { messages, isLoading, error, sendMessage, clearHistory, abort };
}
