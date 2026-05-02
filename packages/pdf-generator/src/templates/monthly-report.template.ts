import type { MonthlyReportData, ProjectWeatherData } from '../monthly-report.types';
import { formatDate } from '../utils/format.util';

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const ENTRY_TYPE_LABELS: Record<string, string> = {
  WORK_ONSITE: 'Présentiel',
  WORK_REMOTE: 'Télétravail',
  WORK_TRAVEL: 'Déplacement',
  LEAVE_CP: 'Congé payé',
  LEAVE_RTT: 'RTT',
  SICK: 'Maladie',
  HOLIDAY: 'Jour férié',
  TRAINING: 'Formation',
  ASTREINTE: 'Astreinte',
  OVERTIME: 'Heures sup.',
};

const WEATHER_COLORS: Record<string, string> = {
  SUNNY: '#f59e0b',
  CLOUDY: '#9ca3af',
  RAINY: '#3b82f6',
  STORM: '#7c3aed',
  VALIDATION_PENDING: '#f97316',
  VALIDATED: '#22c55e',
};

function weatherDot(state: string): string {
  const color = WEATHER_COLORS[state] ?? '#d1d5db';
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};vertical-align:middle;"></span>`;
}

const WEATHER_LABELS: Record<string, string> = {
  SUNNY: 'Ensoleillé',
  CLOUDY: 'Nuageux',
  RAINY: 'Pluvieux',
  STORM: 'Orageux',
  VALIDATION_PENDING: 'Validation en attente',
  VALIDATED: 'Validé',
};

function safe(value: string | null | undefined): string {
  return value ?? 'Non renseigné';
}

function buildWeatherCalendar(
  year: number,
  month: number,
  entries: import('../monthly-report.types').ProjectWeatherEntry[],
): string {
  const dayMap = new Map<number, string>();
  for (const e of entries) {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      dayMap.set(d.getDate(), e.state);
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay() returns 0=Sun … 6=Sat; convert to Mon=0 … Sun=6
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const headerRow = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    .map((d) => `<th class="cal-header">${d}</th>`)
    .join('');

  const cells: string[] = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push('<td class="cal-cell cal-empty"></td>');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const state = dayMap.get(day);
    const icon = state ? weatherDot(state) : '';
    const stateClass = state ? ' cal-has-weather' : '';
    cells.push(`<td class="cal-cell${stateClass}">
        <div class="cal-day-num">${day}</div>
        ${icon ? `<div class="cal-day-icon">${icon}</div>` : ''}
      </td>`);
  }

  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const slice = cells.slice(i, i + 7);
    while (slice.length < 7) slice.push('<td class="cal-cell cal-empty"></td>');
    rows.push(`<tr>${slice.join('')}</tr>`);
  }

  return `<table class="weather-calendar">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

function buildCraSection(data: MonthlyReportData): string {
  if (data.craEntries.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">Activité CRA</h2>
        <p class="empty-notice">Aucune activité ce mois</p>
      </section>
    `;
  }

  const rows = data.craEntries.map((entry) => {
    const label = ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType;
    const projects = entry.projects.map((p) => p.name).join(', ') || '—';
    return `
      <tr>
        <td>${formatDate(entry.date)}</td>
        <td>${label}</td>
        <td>${entry.dayFraction}</td>
        <td>${projects}</td>
        <td>${entry.comment ?? '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <section class="section">
      <h2 class="section-title">Activité CRA</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Fraction</th>
            <th>Projets</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function buildProjectsSection(data: MonthlyReportData): string {
  if (data.projects.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">Projets de la mission</h2>
        <p class="empty-notice">Aucun projet associé à cette mission</p>
      </section>
    `;
  }

  const rows = data.projects.map((p) => `
    <tr>
      <td>${p.projectName}</td>
      <td>${p.status}</td>
    </tr>
  `).join('');

  return `
    <section class="section">
      <h2 class="section-title">Projets de la mission</h2>
      <table class="data-table">
        <thead>
          <tr><th>Nom du projet</th><th>Statut</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function buildWeatherSection(year: number, month: number, weatherData: ProjectWeatherData[]): string {
  if (weatherData.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">Suivi météo des projets</h2>
        <p class="empty-notice">Aucune donnée météo</p>
      </section>
    `;
  }

  const projectBlocks = weatherData.map((pw) => {
    const calendar = buildWeatherCalendar(year, month, pw.entries);

    const rows = pw.entries.map((entry) => {
      const dot = weatherDot(entry.state);
      const label = WEATHER_LABELS[entry.state] ?? entry.state;
      return `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${dot} ${label}</td>
          <td>${entry.comment ?? '—'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="project-weather-block">
        <h3 class="project-weather-title">${pw.projectName}</h3>
        ${calendar}
        <div style="margin-top:12px;">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>État</th><th>Commentaire</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section class="section">
      <h2 class="section-title">Suivi météo des projets</h2>
      ${projectBlocks}
    </section>
  `;
}

export function buildMonthlyReportHtml(data: MonthlyReportData): string {
  const monthLabel = MONTH_NAMES_FR[data.month - 1] ?? String(data.month);
  const generatedAt = formatDate(new Date());

  const weatherSection =
    data.reportType === 'CRA_WITH_WEATHER'
      ? buildWeatherSection(data.year, data.month, data.weatherData ?? [])
      : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Compte rendu ${monthLabel} ${data.year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    h2.section-title { font-size: 13px; font-weight: bold; margin-bottom: 8px;
      border-bottom: 2px solid #2563eb; padding-bottom: 4px; color: #1d4ed8; }
    h3.project-weather-title { font-size: 12px; font-weight: bold; margin: 8px 0 4px; }
    .header { margin-bottom: 20px; }
    .header-subtitle { font-size: 13px; color: #4b5563; }
    .identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .identity-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; }
    .identity-label { font-size: 10px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
    .identity-value { font-size: 12px; font-weight: bold; }
    .section { margin-bottom: 24px; }
    .empty-notice { color: #9ca3af; font-style: italic; padding: 8px 0; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { background: #f3f4f6; text-align: left; padding: 6px 8px;
      font-size: 10px; text-transform: uppercase; color: #374151; }
    .data-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
    .data-table tr:hover td { background: #fafafa; }
    .project-weather-block { margin-bottom: 24px; }
    .weather-calendar { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
    .cal-header { background: #dbeafe; text-align: center; padding: 4px 2px;
      font-size: 9px; font-weight: bold; color: #1e40af; border: 1px solid #bfdbfe; }
    .cal-cell { border: 1px solid #e5e7eb; width: 14.28%; text-align: center;
      padding: 3px 2px; vertical-align: top; min-height: 28px; }
    .cal-empty { background: #f9fafb; }
    .cal-has-weather { background: #eff6ff; }
    .cal-day-num { font-size: 9px; color: #6b7280; }
    .cal-day-icon { font-size: 14px; line-height: 1.2; }
    .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #e5e7eb;
      font-size: 9px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Compte rendu ${monthLabel} ${data.year}</h1>
    <p class="header-subtitle">${data.employeeName}</p>
  </div>

  <div class="identity-grid">
    <div class="identity-card">
      <div class="identity-label">ESN</div>
      <div class="identity-value">${safe(data.esnName)}</div>
      <div style="margin-top:4px;font-size:11px;color:#4b5563;">Responsable : ${safe(data.esnManagerName)}</div>
    </div>
    <div class="identity-card">
      <div class="identity-label">Client</div>
      <div class="identity-value">${safe(data.clientName)}</div>
      <div style="margin-top:4px;font-size:11px;color:#4b5563;">Responsable : ${safe(data.clientManagerName)}</div>
    </div>
  </div>

  ${buildCraSection(data)}
  ${buildProjectsSection(data)}
  ${weatherSection}

  <div class="footer">
    Généré le ${generatedAt} — Données confidentielles
  </div>
</body>
</html>`;
}
