import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CraEntryType, LeaveType } from '@esn/shared-types';
import type { CraPdfData } from './types';

// Mock puppeteer-core before importing the generator
vi.mock('puppeteer-core', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import puppeteer from 'puppeteer-core';
import { CraPdfGenerator } from './cra-pdf.generator';

const makeSampleData = (overrides: Partial<CraPdfData> = {}): CraPdfData => ({
  employee: { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@esn.fr' },
  mission: { title: 'Mission Alpha', startDate: new Date('2026-01-01'), endDate: null },
  client: { firstName: 'Alice', lastName: 'Martin' },
  year: 2026,
  month: 3,
  entries: [
    {
      date: new Date('2026-03-02'),
      entryType: CraEntryType.WORK_ONSITE,
      dayFraction: 1,
      comment: null,
      projects: [{ name: 'Projet X', portion: null }],
    },
  ],
  summary: {
    totalWorkDays: 20,
    totalLeaveDays: 2,
    totalSickDays: 0,
    workingDaysInMonth: 21,
    isOvertime: false,
    leaveBalances: [
      { leaveType: LeaveType.PAID_LEAVE, totalDays: 25, usedDays: 2 },
    ],
  },
  projectsSummary: [{ name: 'Projet X', daysSpent: 20 }],
  signatures: {
    employee: { signedAt: new Date('2026-03-31'), name: 'Jean Dupont' },
    esn: { signedAt: null, name: 'ESN Admin' },
    client: { signedAt: null, name: 'Alice Martin' },
  },
  ...overrides,
});

describe('CraPdfGenerator', () => {
  let generator: CraPdfGenerator;
  let mockBrowser: ReturnType<typeof vi.fn>;
  let mockPage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new CraPdfGenerator();

    mockPage = {
      setContent: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };

    mockBrowser = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as never);
  });

  it('should call puppeteer.launch and page.pdf', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    expect(puppeteer.launch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox'],
    });
    expect(mockPage.pdf).toHaveBeenCalledWith({ format: 'A4', printBackground: true });
  });

  it('should return a non-empty Buffer', async () => {
    const data = makeSampleData();
    const result = await generator.generate(data);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include employee name in generated HTML', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    const setContentCall = mockPage.setContent.mock.calls[0];
    const html: string = setContentCall[0];
    expect(html).toContain('Jean');
    expect(html).toContain('Dupont');
  });

  it('should include mission title in generated HTML', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    expect(html).toContain('Mission Alpha');
  });

  it('should include project summary section when projectsSummary is provided', async () => {
    const data = makeSampleData({ projectsSummary: [{ name: 'Projet X', daysSpent: 20 }] });
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    expect(html).toContain('Projet X');
    // Check project annex section is present
    expect(html).toContain('Annexe');
  });

  it('should omit project summary section when projectsSummary is null', async () => {
    const data = makeSampleData({ projectsSummary: null });
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    expect(html).not.toContain('Annexe');
  });

  it('should render 3 signature zones', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    // Count signature zone occurrences
    const signatureZoneMatches = html.match(/signature-zone/g) ?? [];
    expect(signatureZoneMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('should show signedAt date in employee signature zone when provided', async () => {
    const data = makeSampleData({
      signatures: {
        employee: { signedAt: new Date('2026-03-31'), name: 'Jean Dupont' },
        esn: { signedAt: null, name: 'ESN Admin' },
        client: { signedAt: null, name: 'Alice Martin' },
      },
    });
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    // 31/03/2026 should appear
    expect(html).toContain('31/03/2026');
  });

  it('should show "En attente" when signedAt is null in a zone', async () => {
    const data = makeSampleData({
      signatures: {
        employee: { signedAt: null, name: 'Jean Dupont' },
        esn: { signedAt: null, name: 'ESN Admin' },
        client: null,
      },
    });
    await generator.generate(data);

    const html: string = mockPage.setContent.mock.calls[0][0];
    expect(html).toContain('En attente');
  });

  it('should close browser after generating PDF', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should set page content with waitUntil networkidle0', async () => {
    const data = makeSampleData();
    await generator.generate(data);

    expect(mockPage.setContent).toHaveBeenCalledWith(
      expect.any(String),
      { waitUntil: 'networkidle0' },
    );
  });
});
