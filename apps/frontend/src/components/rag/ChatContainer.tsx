'use client';

import { useState, useEffect, useRef } from 'react';
import { useRagChat } from '../../hooks/useRagChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { Mission } from '../../lib/api/missions';

const SUGGESTED_QUESTIONS_GENERAL = [
  'Combien de jours j\'ai travaillé ce mois-ci ?',
  'Quel est l\'état des jalons de mon projet ?',
  'Résume la météo de mon projet ce trimestre.',
  'Quelles congés j\'ai posés en 2026 ?',
];

const SUGGESTED_QUESTIONS_MISSION = [
  'Résume les documents de cet espace.',
  'Quels sont les points clés de la politique BYOD ?',
  'Y a-t-il des documents obsolètes dans cet espace ?',
];

interface Props {
  accessToken: string;
  missions: Mission[];
}

export function ChatContainer({ accessToken, missions }: Props): JSX.Element {
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [ragMode, setRagMode] = useState<'question' | 'information'>('question');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, clearHistory, abort } = useRagChat(
    accessToken,
    {
      missionId: selectedMissionId || undefined,
      mode: selectedMissionId ? ragMode : 'question',
    },
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset mode to question when mission changes
  useEffect(() => {
    setRagMode('question');
  }, [selectedMissionId]);

  const isEmpty = messages.length === 0;
  const activeMissions = missions.filter(
    (m) => m.isActive || (m.endDate && new Date(m.endDate) > new Date(Date.now() - 30 * 86400_000)),
  );
  const suggestedQuestions = selectedMissionId ? SUGGESTED_QUESTIONS_MISSION : SUGGESTED_QUESTIONS_GENERAL;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Assistant IA</h1>
          <p className="text-sm text-gray-500">
            {selectedMissionId
              ? ragMode === 'information'
                ? 'Mode information — comparez vos données avec les documents de la mission'
                : 'Posez des questions sur les documents de la mission'
              : 'Posez des questions sur vos données CRA et projets'}
          </p>
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

      {/* Mission selector + mode toggle */}
      {activeMissions.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={selectedMissionId}
            onChange={(e) => {
              clearHistory();
              setSelectedMissionId(e.target.value);
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Assistant général</option>
            {activeMissions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          {selectedMissionId && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setRagMode('question')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  ragMode === 'question'
                    ? 'bg-white text-gray-900 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Question
              </button>
              <button
                onClick={() => setRagMode('information')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  ragMode === 'information'
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Information
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500 mb-6 text-sm">
              {selectedMissionId && ragMode === 'information'
                ? 'Partagez une information — l\'assistant la comparera avec les documents de la mission.'
                : 'Je peux répondre à vos questions sur vos CRA, projets, météo et documents.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestedQuestions.map((q) => (
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
      <ChatInput
        onSend={(q) => void sendMessage(q)}
        onAbort={isLoading ? abort : undefined}
        disabled={isLoading}
        placeholder={
          ragMode === 'information'
            ? 'Décrivez une information à comparer avec les documents…'
            : 'Posez votre question…'
        }
      />
    </div>
  );
}
