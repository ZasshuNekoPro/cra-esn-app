// ─── RAG Engine — Chunker ─────────────────────────────────────────────────────
// Splits source entities into indexable TextChunks.
// CRA entries and milestones are atomic (1 chunk each).
// Free text (comments, documents) uses RecursiveCharacterTextSplitter via LangChain.

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type {
  TextChunk,
  CraEntryInput,
  CraMonthInput,
  ProjectCommentInput,
  WeatherEntryInput,
  MilestoneInput,
  DocumentInput,
} from '../types';

const MONTH_NAMES_FR = [
  '', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 50,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

const docSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
  separators: ['\n\n', '\n', '. ', ' ', ''],
});

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ── CRA Entry — atomic chunk ──────────────────────────────────────────────────

export function chunkCraEntry(input: CraEntryInput): TextChunk[] {
  const dateStr = toDateStr(input.date);
  const comment = input.comment ? ` — ${input.comment}` : '';
  const content = `CRA ${dateStr} : ${input.entryType} (${input.dayFraction === 1 ? 'journée entière' : 'demi-journée'})${comment}`;

  return [
    {
      content,
      metadata: {
        employeeId: input.employeeId,
        sourceType: 'cra_entry',
        sourceId: input.id,
        date: dateStr,
        year: input.date.getFullYear(),
        month: input.date.getMonth() + 1,
      },
    },
  ];
}

// ── CRA Month — one chunk for the activity summary ───────────────────────────

export function chunkCraMonth(input: CraMonthInput): TextChunk[] {
  if (!input.activitySummary) return [];

  const monthName = MONTH_NAMES_FR[input.month];
  const content = `Résumé d'activité ${monthName} ${input.year} : ${input.activitySummary}`;

  return [
    {
      content,
      metadata: {
        employeeId: input.employeeId,
        sourceType: 'cra_month',
        sourceId: input.id,
        year: input.year,
        month: input.month,
      },
    },
  ];
}

// ── Project Comment — may split on long content ───────────────────────────────

export async function chunkProjectCommentAsync(input: ProjectCommentInput): Promise<TextChunk[]> {
  const dateStr = toDateStr(input.date);
  const header = `Commentaire projet (${dateStr}) : `;
  const parts = await textSplitter.splitText(input.content);

  return parts.map((part, i) => ({
    content: i === 0 ? header + part : part,
    metadata: {
      employeeId: input.employeeId,
      sourceType: 'project_comment' as const,
      sourceId: input.id,
      projectId: input.projectId,
      date: dateStr,
      year: input.date.getFullYear(),
      month: input.date.getMonth() + 1,
    },
  }));
}

// Sync version for tests (for short content)
export function chunkProjectComment(input: ProjectCommentInput): TextChunk[] {
  const dateStr = toDateStr(input.date);
  const maxChunkSize = 512;
  const words = input.content.split(' ');
  const chunks: string[] = [];

  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks.map((part, i) => ({
    content: i === 0 ? `Commentaire projet (${dateStr}) : ${part}` : part,
    metadata: {
      employeeId: input.employeeId,
      sourceType: 'project_comment' as const,
      sourceId: input.id,
      projectId: input.projectId,
      date: dateStr,
      year: input.date.getFullYear(),
      month: input.date.getMonth() + 1,
    },
  }));
}

// ── Weather Entry — atomic chunk ──────────────────────────────────────────────

export function chunkWeatherEntry(input: WeatherEntryInput): TextChunk[] {
  const dateStr = toDateStr(input.date);
  const comment = input.comment ? ` — ${input.comment}` : '';
  const content = `Météo projet ${dateStr} : ${input.state}${comment}`;

  return [
    {
      content,
      metadata: {
        employeeId: input.employeeId,
        sourceType: 'weather_entry',
        sourceId: input.id,
        projectId: input.projectId,
        date: dateStr,
        year: input.date.getFullYear(),
        month: input.date.getMonth() + 1,
      },
    },
  ];
}

// ── Milestone — atomic chunk ──────────────────────────────────────────────────

export function chunkMilestone(input: MilestoneInput): TextChunk[] {
  const dueDateStr = input.dueDate ? toDateStr(input.dueDate) : 'sans échéance';
  const description = input.description ? ` — ${input.description}` : '';
  const content = `Jalon "${input.title}" : statut ${input.status}, échéance ${dueDateStr}${description}`;

  return [
    {
      content,
      metadata: {
        employeeId: input.employeeId,
        sourceType: 'milestone',
        sourceId: input.id,
        projectId: input.projectId,
        ...(input.dueDate && { date: toDateStr(input.dueDate) }),
      },
    },
  ];
}

// ── Document — may split on long extracted text ───────────────────────────────

export async function chunkDocumentAsync(input: DocumentInput): Promise<TextChunk[]> {
  if (!input.extractedText) return [];

  const parts = await docSplitter.splitText(input.extractedText);
  return parts.map((part) => ({
    content: `[${input.name}] ${part}`,
    metadata: {
      employeeId: input.employeeId,
      sourceType: 'document' as const,
      sourceId: input.id,
    },
  }));
}

// Sync version for tests
export function chunkDocument(input: DocumentInput): TextChunk[] {
  if (!input.extractedText) return [];

  const maxChunkSize = 512;
  const overlap = 100;
  const text = input.extractedText;
  const chunks: string[] = [];

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks.map((part) => ({
    content: `[${input.name}] ${part}`,
    metadata: {
      employeeId: input.employeeId,
      sourceType: 'document' as const,
      sourceId: input.id,
    },
  }));
}
