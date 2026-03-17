import { describe, it, expect } from 'vitest';
import { chunkCraEntry, chunkCraMonth, chunkProjectComment, chunkWeatherEntry, chunkMilestone, chunkDocument } from '../src/chunker/chunker';

// ─── CraEntry ─────────────────────────────────────────────────────────────────

describe('chunkCraEntry', () => {
  it('should produce exactly one chunk per entry', () => {
    const chunks = chunkCraEntry({
      id: 'entry-1',
      date: new Date('2026-02-10'),
      entryType: 'WORK_ONSITE',
      dayFraction: 1,
      comment: 'Review sprint',
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(1);
  });

  it('should include date, type and comment in the chunk content', () => {
    const chunks = chunkCraEntry({
      id: 'entry-1',
      date: new Date('2026-02-10'),
      entryType: 'WORK_REMOTE',
      dayFraction: 0.5,
      comment: 'Réunion client',
      employeeId: 'emp-1',
    });
    expect(chunks[0].content).toContain('2026-02-10');
    expect(chunks[0].content).toContain('WORK_REMOTE');
    expect(chunks[0].content).toContain('Réunion client');
  });

  it('should set correct metadata on the chunk', () => {
    const chunks = chunkCraEntry({
      id: 'entry-1',
      date: new Date('2026-02-10'),
      entryType: 'LEAVE_CP',
      dayFraction: 1,
      comment: null,
      employeeId: 'emp-1',
    });
    expect(chunks[0].metadata).toMatchObject({
      employeeId: 'emp-1',
      sourceType: 'cra_entry',
      sourceId: 'entry-1',
      date: '2026-02-10',
      year: 2026,
      month: 2,
    });
  });

  it('should handle null comment without error', () => {
    expect(() =>
      chunkCraEntry({
        id: 'entry-2',
        date: new Date('2026-02-11'),
        entryType: 'HOLIDAY',
        dayFraction: 1,
        comment: null,
        employeeId: 'emp-1',
      }),
    ).not.toThrow();
  });
});

// ─── CraMonth ─────────────────────────────────────────────────────────────────

describe('chunkCraMonth', () => {
  it('should produce exactly one chunk for the month summary', () => {
    const chunks = chunkCraMonth({
      id: 'month-1',
      year: 2026,
      month: 2,
      activitySummary: 'Développement feature X, revues de code, réunions sprint',
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(1);
  });

  it('should include year, month and summary text in chunk content', () => {
    const chunks = chunkCraMonth({
      id: 'month-1',
      year: 2026,
      month: 2,
      activitySummary: 'Feature X terminée',
      employeeId: 'emp-1',
    });
    expect(chunks[0].content).toContain('2026');
    expect(chunks[0].content).toContain('février');
    expect(chunks[0].content).toContain('Feature X terminée');
  });

  it('should return empty array when activitySummary is null', () => {
    const chunks = chunkCraMonth({
      id: 'month-1',
      year: 2026,
      month: 2,
      activitySummary: null,
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(0);
  });

  it('should set correct metadata', () => {
    const chunks = chunkCraMonth({
      id: 'month-1',
      year: 2026,
      month: 2,
      activitySummary: 'Activités du mois',
      employeeId: 'emp-1',
    });
    expect(chunks[0].metadata).toMatchObject({
      sourceType: 'cra_month',
      sourceId: 'month-1',
      year: 2026,
      month: 2,
    });
  });
});

// ─── ProjectComment ───────────────────────────────────────────────────────────

describe('chunkProjectComment', () => {
  it('should produce at least one chunk for a short comment', () => {
    const chunks = chunkProjectComment({
      id: 'comment-1',
      content: 'Blocage sur le module auth',
      projectId: 'project-1',
      date: new Date('2026-02-15'),
      employeeId: 'emp-1',
    });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('should split a long comment into multiple chunks', () => {
    const longContent = 'Mot '.repeat(300); // ~300 words → >512 tokens
    const chunks = chunkProjectComment({
      id: 'comment-2',
      content: longContent,
      projectId: 'project-1',
      date: new Date('2026-02-15'),
      employeeId: 'emp-1',
    });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should include projectId in metadata', () => {
    const chunks = chunkProjectComment({
      id: 'comment-1',
      content: 'RAS',
      projectId: 'project-1',
      date: new Date('2026-02-15'),
      employeeId: 'emp-1',
    });
    expect(chunks[0].metadata.projectId).toBe('project-1');
  });
});

// ─── WeatherEntry ─────────────────────────────────────────────────────────────

describe('chunkWeatherEntry', () => {
  it('should produce exactly one chunk per weather entry', () => {
    const chunks = chunkWeatherEntry({
      id: 'weather-1',
      date: new Date('2026-02-12'),
      state: 'STORM',
      comment: 'Blocage infra critique',
      projectId: 'project-1',
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(1);
  });

  it('should include state and comment in content', () => {
    const chunks = chunkWeatherEntry({
      id: 'weather-1',
      date: new Date('2026-02-12'),
      state: 'RAINY',
      comment: 'Retard livraison',
      projectId: 'project-1',
      employeeId: 'emp-1',
    });
    expect(chunks[0].content).toContain('RAINY');
    expect(chunks[0].content).toContain('Retard livraison');
  });

  it('should handle null comment', () => {
    expect(() =>
      chunkWeatherEntry({
        id: 'weather-2',
        date: new Date('2026-02-13'),
        state: 'SUNNY',
        comment: null,
        projectId: 'project-1',
        employeeId: 'emp-1',
      }),
    ).not.toThrow();
  });
});

// ─── Milestone ────────────────────────────────────────────────────────────────

describe('chunkMilestone', () => {
  it('should produce exactly one chunk per milestone', () => {
    const chunks = chunkMilestone({
      id: 'milestone-1',
      title: 'Livraison V2',
      description: 'Déploiement en production',
      status: 'LATE',
      dueDate: new Date('2026-02-01'),
      projectId: 'project-1',
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(1);
  });

  it('should include title, status and dueDate in content', () => {
    const chunks = chunkMilestone({
      id: 'milestone-1',
      title: 'Recette fonctionnelle',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-03-01'),
      projectId: 'project-1',
      employeeId: 'emp-1',
    });
    expect(chunks[0].content).toContain('Recette fonctionnelle');
    expect(chunks[0].content).toContain('IN_PROGRESS');
    expect(chunks[0].content).toContain('2026-03-01');
  });
});

// ─── Document ─────────────────────────────────────────────────────────────────

describe('chunkDocument', () => {
  it('should produce one chunk for a short text', () => {
    const chunks = chunkDocument({
      id: 'doc-1',
      name: 'Contrat',
      extractedText: 'Contrat de mission ESN signé le 01/01/2026.',
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(1);
  });

  it('should split a long document text into multiple chunks', () => {
    const longText = 'Paragraphe de texte. '.repeat(200);
    const chunks = chunkDocument({
      id: 'doc-1',
      name: 'Convention',
      extractedText: longText,
      employeeId: 'emp-1',
    });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should return empty array when extractedText is null', () => {
    const chunks = chunkDocument({
      id: 'doc-1',
      name: 'PDF binaire',
      extractedText: null,
      employeeId: 'emp-1',
    });
    expect(chunks).toHaveLength(0);
  });

  it('should set sourceType to document in all chunks metadata', () => {
    const chunks = chunkDocument({
      id: 'doc-1',
      name: 'Doc',
      extractedText: 'Contenu du document.',
      employeeId: 'emp-1',
    });
    for (const chunk of chunks) {
      expect(chunk.metadata.sourceType).toBe('document');
    }
  });
});
