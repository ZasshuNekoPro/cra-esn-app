// ─── RAG Engine — Shared Types ────────────────────────────────────────────────

// Keep in sync with RagSourceType in @esn/shared-types
export type RagSourceType = 'cra_entry' | 'cra_month' | 'project_comment' | 'weather_entry' | 'milestone' | 'document';

export interface EmbeddingMetadata {
  employeeId: string;
  sourceType: RagSourceType;
  sourceId: string;
  projectId?: string;
  year?: number;
  month?: number;
  date?: string; // ISO date string e.g. "2026-02-10"
}

export interface TextChunk {
  content: string;
  metadata: EmbeddingMetadata;
}

// ── Input shapes for chunkers ─────────────────────────────────────────────────

export interface CraEntryInput {
  id: string;
  date: Date;
  entryType: string;
  dayFraction: number;
  comment: string | null;
  employeeId: string;
}

export interface CraMonthInput {
  id: string;
  year: number;
  month: number;
  activitySummary: string | null;
  employeeId: string;
}

export interface ProjectCommentInput {
  id: string;
  content: string;
  projectId: string;
  date: Date;
  employeeId: string;
}

export interface WeatherEntryInput {
  id: string;
  date: Date;
  state: string;
  comment: string | null;
  projectId: string;
  employeeId: string;
}

export interface MilestoneInput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  projectId: string;
  employeeId: string;
}

export interface DocumentInput {
  id: string;
  name: string;
  extractedText: string | null;
  employeeId: string;
}
