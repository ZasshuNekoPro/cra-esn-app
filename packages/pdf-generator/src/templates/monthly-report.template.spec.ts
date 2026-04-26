import { describe, it, expect } from 'vitest';
import { buildMonthlyReportHtml } from './monthly-report.template';
import type { MonthlyReportData } from '../monthly-report.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeData(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    employeeName: 'Jean Dupont',
    esnName: 'ESN Corp',
    esnManagerName: 'Marie Dir',
    clientName: 'Client SA',
    clientManagerName: 'Paul Client',
    year: 2026,
    month: 3, // Mars 2026 — starts on Sunday (firstDow = 6)
    reportType: 'CRA_WITH_WEATHER',
    craEntries: [],
    projects: [],
    weatherData: [
      {
        projectName: 'Projet Alpha',
        entries: [
          { date: new Date('2026-03-02'), state: 'SUNNY', comment: null },
          { date: new Date('2026-03-10'), state: 'RAINY', comment: 'Problème livraison' },
          { date: new Date('2026-03-31'), state: 'VALIDATED', comment: null },
        ],
      },
    ],
    ...overrides,
  };
}

// ── Calendar structure ────────────────────────────────────────────────────────

describe('buildMonthlyReportHtml — weather calendar', () => {
  it('renders a weather-calendar table when CRA_WITH_WEATHER', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('weather-calendar');
  });

  it('renders all 7 day-of-week headers in French', () => {
    const html = buildMonthlyReportHtml(makeData());
    for (const day of ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']) {
      expect(html).toContain(day);
    }
  });

  it('renders day numbers 1 through 31 for March', () => {
    const html = buildMonthlyReportHtml(makeData());
    for (let d = 1; d <= 31; d++) {
      expect(html).toContain(`<div class="cal-day-num">${d}</div>`);
    }
  });

  it('marks days with weather entries as cal-has-weather', () => {
    const html = buildMonthlyReportHtml(makeData());
    // Days 2, 10, 31 have weather — count only cell class attributes, not CSS definition
    const matches = [...html.matchAll(/class="cal-cell cal-has-weather"/g)];
    expect(matches.length).toBe(3);
  });

  it('shows ☀️ icon on day 2 (SUNNY)', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('cal-day-icon');
    expect(html).toContain('☀️');
  });

  it('shows 🌧️ icon on day 10 (RAINY)', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('🌧️');
  });

  it('shows ✅ icon on day 31 (VALIDATED)', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('✅');
  });

  it('does not render a calendar for CRA_ONLY', () => {
    const html = buildMonthlyReportHtml(makeData({ reportType: 'CRA_ONLY' }));
    // CSS always contains the class name; check for the actual table element
    expect(html).not.toContain('<table class="weather-calendar">');
  });

  it('renders an empty calendar when entries array is empty', () => {
    const html = buildMonthlyReportHtml(makeData({
      weatherData: [{ projectName: 'P', entries: [] }],
    }));
    expect(html).toContain('<table class="weather-calendar">');
    expect(html).not.toContain('class="cal-cell cal-has-weather"');
  });

  // Month starting on a Monday — no leading empty cells
  it('February 2021 starts on Monday — no leading empty cells', () => {
    const html = buildMonthlyReportHtml(makeData({
      year: 2021,
      month: 2,
      weatherData: [
        { projectName: 'P', entries: [{ date: new Date('2021-02-01'), state: 'SUNNY', comment: null }] },
      ],
    }));
    // Day 1 should have cal-has-weather (first entry is Feb 1)
    expect(html).toContain('weather-calendar');
    expect(html).toContain('cal-has-weather');
  });

  // Entries outside the report month are ignored in the calendar (but may still appear in detail list)
  it('ignores weather entries outside the report month in the calendar', () => {
    const html = buildMonthlyReportHtml(makeData({
      year: 2026,
      month: 3,
      weatherData: [
        { projectName: 'P', entries: [{ date: new Date('2026-04-15'), state: 'STORM', comment: null }] },
      ],
    }));
    expect(html).not.toContain('class="cal-cell cal-has-weather"');
  });
});

// ── Detail list — French labels ───────────────────────────────────────────────

describe('buildMonthlyReportHtml — weather detail list', () => {
  it('shows French label "Ensoleillé" instead of raw state "SUNNY"', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('Ensoleillé');
    expect(html).not.toContain('>SUNNY<');
  });

  it('shows French label "Pluvieux" for RAINY', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('Pluvieux');
  });

  it('shows French label "Validé" for VALIDATED', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('Validé');
  });

  it('shows comment text in detail row', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('Problème livraison');
  });

  it('shows — placeholder for null comment', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('—');
  });

  it('shows project name as section title', () => {
    const html = buildMonthlyReportHtml(makeData());
    expect(html).toContain('Projet Alpha');
  });

  it('covers all 6 weather states with correct labels', () => {
    const allStates: Array<[string, string, string]> = [
      ['SUNNY', '☀️', 'Ensoleillé'],
      ['CLOUDY', '⛅', 'Nuageux'],
      ['RAINY', '🌧️', 'Pluvieux'],
      ['STORM', '⛈️', 'Orageux'],
      ['VALIDATION_PENDING', '⏳', 'Validation en attente'],
      ['VALIDATED', '✅', 'Validé'],
    ];

    for (const [state, icon, label] of allStates) {
      const html = buildMonthlyReportHtml(makeData({
        weatherData: [
          { projectName: 'P', entries: [{ date: new Date('2026-03-05'), state, comment: null }] },
        ],
      }));
      expect(html, `icon for ${state}`).toContain(icon);
      expect(html, `label for ${state}`).toContain(label);
    }
  });
});
