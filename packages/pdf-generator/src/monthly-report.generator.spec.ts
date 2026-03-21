import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { MonthlyReportData } from './monthly-report.types';

// Mock puppeteer-core before importing the generator
vi.mock('puppeteer-core', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from('monthly-pdf-content')),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import puppeteer from 'puppeteer-core';
import { MonthlyReportPdfGenerator } from './monthly-report.generator';

const makeSampleData = (overrides: Partial<MonthlyReportData> = {}): MonthlyReportData => ({
  employeeName: 'Jean Dupont',
  esnName: 'ESN Corp',
  esnManagerName: 'Marie Directeur',
  clientName: 'Client SA',
  clientManagerName: 'Paul Client',
  year: 2026,
  month: 3, // Mars
  reportType: 'CRA_ONLY',
  craEntries: [
    {
      date: new Date('2026-03-02'),
      entryType: 'WORK_ONSITE',
      dayFraction: 1,
      comment: null,
      projects: [{ name: 'Projet Alpha' }],
    },
    {
      date: new Date('2026-03-03'),
      entryType: 'WORK_REMOTE',
      dayFraction: 1,
      comment: null,
      projects: [{ name: 'Projet Alpha' }],
    },
  ],
  projects: [
    { projectId: 'proj-1', projectName: 'Projet Alpha', status: 'ACTIVE' },
  ],
  ...overrides,
});

describe('MonthlyReportPdfGenerator', () => {
  let generator: MonthlyReportPdfGenerator;
  let mockBrowser: { newPage: Mock; close: Mock };
  let mockPage: { setContent: Mock; pdf: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new MonthlyReportPdfGenerator();

    mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(Buffer.from('monthly-pdf-content')),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as never);
  });

  it('generate() with CRA_ONLY returns a non-empty Buffer', async () => {
    const result = await generator.generate(makeSampleData({ reportType: 'CRA_ONLY' }));
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('generate() with CRA_WITH_WEATHER returns a non-empty Buffer', async () => {
    const data = makeSampleData({
      reportType: 'CRA_WITH_WEATHER',
      weatherData: [
        {
          projectName: 'Projet Alpha',
          entries: [
            { date: new Date('2026-03-05'), state: 'SUNNY', comment: null },
            { date: new Date('2026-03-10'), state: 'RAINY', comment: 'Difficultés techniques' },
          ],
        },
      ],
    });
    const result = await generator.generate(data);
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('generated HTML contains "Compte rendu Mars 2026"', async () => {
    await generator.generate(makeSampleData());
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Mars 2026');
    expect(html.toLowerCase()).toContain('compte rendu');
  });

  it('generated HTML contains ESN name', async () => {
    await generator.generate(makeSampleData({ esnName: 'TechSolutions ESN' }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('TechSolutions ESN');
  });

  it('generated HTML contains employee name', async () => {
    await generator.generate(makeSampleData({ employeeName: 'Sophie Martin' }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Sophie Martin');
  });

  it('empty craEntries → section displays "Aucune activité ce mois"', async () => {
    await generator.generate(makeSampleData({ craEntries: [] }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Aucune activité ce mois');
  });

  it('CRA_WITH_WEATHER with empty weatherData → section displays "Aucune donnée météo"', async () => {
    await generator.generate(makeSampleData({
      reportType: 'CRA_WITH_WEATHER',
      weatherData: [],
    }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Aucune donnée météo');
  });

  it('esnManagerName null/absent → displays "Non renseigné"', async () => {
    await generator.generate(makeSampleData({ esnManagerName: null }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Non renseigné');
  });

  it('CRA_ONLY does not include weather section', async () => {
    await generator.generate(makeSampleData({ reportType: 'CRA_ONLY' }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).not.toContain('Suivi météo');
  });

  it('CRA_WITH_WEATHER includes weather section', async () => {
    await generator.generate(makeSampleData({
      reportType: 'CRA_WITH_WEATHER',
      weatherData: [
        {
          projectName: 'Projet Beta',
          entries: [{ date: new Date('2026-03-15'), state: 'SUNNY', comment: null }],
        },
      ],
    }));
    const [html] = mockPage.setContent.mock.calls[0] as [string];
    expect(html).toContain('Suivi météo');
    expect(html).toContain('Projet Beta');
  });

  it('uses puppeteer with --no-sandbox and A4 format', async () => {
    await generator.generate(makeSampleData());
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(puppeteer.launch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox'],
    });
    expect(mockPage.pdf).toHaveBeenCalledWith({ format: 'A4', printBackground: true });
  });

  it('closes browser after generation', async () => {
    await generator.generate(makeSampleData());
    expect(mockBrowser.close).toHaveBeenCalled();
  });
});
