import { describe, it, expect, vi } from 'vitest';
import { buildS3Key } from '../../../src/storage/storage.utils';

// mock randomUUID for deterministic output
vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000001'),
}));

describe('buildS3Key', () => {
  it('builds key with projectId', () => {
    const key = buildS3Key('owner-1', 'mission-1', 'project-1', 'Mon Document.pdf');
    expect(key).toBe('owner-1/mission-1/project-1/00000000-0000-0000-0000-000000000001-mon-document.pdf');
  });

  it('falls back to "mission" scope when projectId is null', () => {
    const key = buildS3Key('owner-1', 'mission-1', null, 'file.docx');
    expect(key).toBe('owner-1/mission-1/mission/00000000-0000-0000-0000-000000000001-file.docx');
  });

  it('falls back to "mission" scope when projectId is undefined', () => {
    const key = buildS3Key('owner-1', 'mission-1', undefined, 'notes.txt');
    expect(key).toBe('owner-1/mission-1/mission/00000000-0000-0000-0000-000000000001-notes.txt');
  });

  it('slugifies special characters in filename', () => {
    const key = buildS3Key('o', 'm', 'p', 'Rapport 2026 — ESN (final).PDF');
    expect(key).toContain('rapport-2026-esn-final.pdf');
  });

  it('handles dot-only filenames without crashing', () => {
    // extname('.pdf') === '' in Node.js, so base becomes '.pdf' → slug 'pdf'
    const key = buildS3Key('o', 'm', 'p', '.pdf');
    expect(key).toContain('pdf');
    expect(key).not.toContain('undefined');
  });
});
