'use client';

import type { ChatMessage as ChatMessageType } from '../../hooks/useRagChat';
import { SourcesAccordion } from './SourcesAccordion';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props): JSX.Element {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-900 shadow-sm border border-gray-100'
        }`}
      >
        {!isUser && (
          <p className="text-xs font-semibold text-blue-600 mb-1">Assistant</p>
        )}

        {/* Regular text content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
            {message.isStreaming && !message.comparison && (
              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
            )}
          </p>
        )}

        {/* Comparison result (information mode) */}
        {message.comparison && (
          <div className="mt-2 space-y-3">
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
            )}
            {parseComparisonSections(message.comparison).map((section) => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {section.title}
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Note saved badge */}
        {message.noteSavedId && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <path fillRule="evenodd" d="M10.207 3.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L4.5 7.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Note sauvegardée
          </div>
        )}

        {/* Sources */}
        {!message.isStreaming && message.sources && message.sources.length > 0 && (
          <SourcesAccordion sources={message.sources} />
        )}
      </div>
    </div>
  );
}

function parseComparisonSections(text: string): Array<{ title: string; body: string }> {
  const parts = text.split(/^---$/m);
  return parts
    .map((part) => {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) return null;
      const title = part.slice(0, colonIdx).trim();
      const body = part.slice(colonIdx + 1).trim();
      return { title, body };
    })
    .filter((s): s is { title: string; body: string } => s !== null && s.body.length > 0);
}
