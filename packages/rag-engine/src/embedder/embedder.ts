// ─── RAG Engine — Embedder ────────────────────────────────────────────────────
// Wraps OpenAI text-embedding-3-small via LangChain to produce 1536-dim vectors.

import { OpenAIEmbeddings } from '@langchain/openai';

export class EmbedderService {
  private readonly embeddings: OpenAIEmbeddings;

  constructor(apiKey: string) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey,
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
  }

  async embedText(text: string): Promise<number[]> {
    const [vector] = await this.embeddings.embedDocuments([text]);
    return vector;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.embeddings.embedDocuments(texts);
  }
}
