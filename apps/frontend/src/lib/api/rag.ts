import type { RagQueryRequest, RagSource } from '@esn/shared-types';

const BACKEND_URL = process.env['NEXT_PUBLIC_BACKEND_URL'] ?? 'http://localhost:3001';

export type RagStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'sources'; sources: RagSource[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Streams a RAG query as SSE events using fetch + ReadableStream.
 * Yields parsed events as they arrive.
 */
export async function* streamRagQuery(
  dto: RagQueryRequest,
  token: string,
): AsyncGenerator<RagStreamEvent> {
  const res = await fetch(`${BACKEND_URL}/api/rag/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', message: `HTTP ${res.status}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice('data: '.length).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as RagStreamEvent;
            yield event;
            if (event.type === 'done') return;
          } catch {
            // malformed event — skip
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }
}
