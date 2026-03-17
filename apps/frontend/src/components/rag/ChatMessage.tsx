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
        {/* Avatar indicator */}
        {!isUser && (
          <p className="text-xs font-semibold text-blue-600 mb-1">Assistant</p>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
          )}
        </p>

        {/* Sources */}
        {!message.isStreaming && message.sources && message.sources.length > 0 && (
          <SourcesAccordion sources={message.sources} />
        )}
      </div>
    </div>
  );
}
