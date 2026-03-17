'use client';

import { useEffect, useRef } from 'react';
import { useRagChat } from '../../hooks/useRagChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

const SUGGESTED_QUESTIONS = [
  'Combien de jours j\'ai travaillé ce mois-ci ?',
  'Quel est l\'état des jalons de mon projet ?',
  'Résume la météo de mon projet ce trimestre.',
  'Quelles congés j\'ai posés en 2026 ?',
];

interface Props {
  accessToken: string;
}

export function ChatContainer({ accessToken }: Props): JSX.Element {
  const { messages, isLoading, error, sendMessage, clearHistory } = useRagChat(accessToken);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Assistant IA</h1>
          <p className="text-sm text-gray-500">Posez des questions sur vos données CRA et projets</p>
        </div>
        {!isEmpty && (
          <button
            onClick={clearHistory}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Nouvelle conversation
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500 mb-6 text-sm">
              Je peux répondre à vos questions sur vos CRA, projets, météo et documents.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={(q) => void sendMessage(q)} disabled={isLoading} />
    </div>
  );
}
