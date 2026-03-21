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

const WEATHER_ICONS: Record<string, string> = {
  SUNNY: '☀️',
  CLOUDY: '⛅',
  RAINY: '🌧️',
  STORM: '⛈️',
  VALIDATION_PENDING: '⏳',
  VALIDATED: '✅',
};

function safe(value: string | null | undefined): string {
  return value ?? 'Non renseigné';
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

function buildWeatherSection(weatherData: ProjectWeatherData[]): string {
  if (weatherData.length === 0) {
    return `
      <section class="section">
        <h2 class="section-title">Suivi météo des projets</h2>
        <p class="empty-notice">Aucune donnée météo</p>
      </section>
    `;
  }

  const projectBlocks = weatherData.map((pw) => {
    const rows = pw.entries.map((entry) => {
      const icon = WEATHER_ICONS[entry.state] ?? '❓';
      return `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${icon} ${entry.state}</td>
          <td>${entry.comment ?? '—'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="project-weather-block">
        <h3 class="project-weather-title">${pw.projectName}</h3>
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>État</th><th>Commentaire</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
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
      ? buildWeatherSection(data.weatherData ?? [])
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
    .project-weather-block { margin-bottom: 16px; }
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
