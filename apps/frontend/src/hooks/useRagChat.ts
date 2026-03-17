'use client';

import { useState, useCallback, useRef } from 'react';
import type { RagSource, ConversationTurn } from '@esn/shared-types';
import { streamRagQuery } from '../lib/api/rag';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[];
  isStreaming?: boolean;
}

export function useRagChat(accessToken: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<boolean>(false);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      if (!accessToken || isLoading) return;

      setError(null);
      setIsLoading(true);
      abortRef.current = false;

      // Add user message immediately
      const userMsgId = crypto.randomUUID();
      const assistantMsgId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', content: question },
        { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true },
      ]);

      // Build conversation history (last 10 turns, excluding the new message)
      const history: ConversationTurn[] = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        for await (const event of streamRagQuery(
          { question, messages: history },
          accessToken,
        )) {
          if (abortRef.current) break;

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
          } else if (event.type === 'done' || event.type === 'error') {
            if (event.type === 'error') {
              setError('Une erreur est survenue lors de la génération de la réponse.');
            }
            break;
          }
        }
      } catch (err) {
        setError('Impossible de contacter l\'assistant. Vérifiez votre connexion.');
      } finally {
        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
          ),
        );
        setIsLoading(false);
      }
    },
    [accessToken, isLoading, messages],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearHistory };
}
