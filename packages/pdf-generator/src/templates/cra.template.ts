import { LeaveType } from '@esn/shared-types';
import type { CraPdfData } from '../types';
import { craStyles } from './cra.styles';
import { formatDate, formatDecimal, entryTypeLabel, entryTypeColor } from '../utils/format.util';

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAY_NAMES_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function leaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    [LeaveType.PAID_LEAVE]: 'Congés payés',
    [LeaveType.RTT]: 'RTT',
    [LeaveType.SICK_LEAVE]: 'Maladie',
    [LeaveType.OTHER]: 'Autre',
  };
  return labels[type];
}

function buildDailyTableRows(data: CraPdfData): string {
  if (data.entries.length === 0) {
    return `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:12px;">Aucune saisie</td></tr>`;
  }

  return data.entries
    .map((entry) => {
      const bg = entryTypeColor(entry.entryType);
      const dayName = DAY_NAMES_FR[entry.date.getDay()];
      const projectTags = entry.projects
        .map((p) => `<span class="project-tag">${escapeHtml(p.name)}</span>`)
        .join('');
      return `
        <tr style="background-color:${bg}">
          <td><span class="day-name">${dayName}</span></td>
          <td>${formatDate(entry.date)}</td>
          <td>${entryTypeLabel(entry.entryType)}</td>
          <td>${formatDecimal(entry.dayFraction)} j</td>
          <td>${entry.comment != null ? escapeHtml(entry.comment) : ''}</td>
          <td>${projectTags}</td>
        </tr>`;
    })
    .join('');
}

function buildLeaveBalanceRows(data: CraPdfData): string {
  if (data.summary.leaveBalances.length === 0) {
    return `<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Aucun solde</td></tr>`;
  }

  return data.summary.leaveBalances
    .map((lb) => {
      const remaining = lb.totalDays - lb.usedDays;
      return `
        <tr>
          <td>${leaveTypeLabel(lb.leaveType)}</td>
          <td>${formatDecimal(lb.totalDays)} j</td>
          <td>${formatDecimal(lb.usedDays)} j</td>
          <td><span class="leave-remaining">${formatDecimal(remaining)} j</span></td>
        </tr>`;
    })
    .join('');
}

function buildSignatureZone(
  title: string,
  signatoryName: string,
  signedAt: Date | null,
): string {
  const statusHtml =
    signedAt != null
      ? `<p class="signature-status-signed">Signé le ${formatDate(signedAt)}</p>`
      : `<p class="signature-status-pending">En attente de signature</p>`;

  return `
    <div class="signature-zone">
      <p class="signature-zone-title">${escapeHtml(title)}</p>
      <p class="signature-zone-name">${escapeHtml(signatoryName)}</p>
      ${statusHtml}
    </div>`;
}

function buildProjectAnnex(data: CraPdfData): string {
  if (data.projectsSummary === null) return '';

  const rows = data.projectsSummary
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${formatDecimal(p.daysSpent)} j</td>
      </tr>`,
    )
    .join('');

  return `
    <h2 class="section-title">Annexe — Récapitulatif par projet</h2>
    <table class="project-table">
      <thead>
        <tr>
          <th>Projet</th>
          <th>Jours imputés</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildCraHtml(data: CraPdfData): string {
  const monthName = MONTH_NAMES_FR[data.month - 1];
  const employeeName = `${data.employee.firstName} ${data.employee.lastName}`;
  const clientName =
    data.client != null ? `${data.client.firstName} ${data.client.lastName}` : null;

  const clientZoneName = data.signatures.client?.name ?? (clientName ?? 'Client');
  const clientZoneSignedAt = data.signatures.client?.signedAt ?? null;

  const overtimeBadge = data.summary.isOvertime
    ? `<span class="overtime-badge">Heures supplémentaires</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CRA ${employeeName} — ${monthName} ${data.year}</title>
  <style>${craStyles}</style>
</head>
<body>

  <!-- ── Header ─────────────────────────────────────────────────────── -->
  <header class="header">
    <div>
      <p class="header-title">Compte-Rendu d'Activité</p>
      <p class="header-subtitle">Document officiel — ESN CRA App</p>
    </div>
    <div class="header-meta">
      <p class="header-period">${monthName} ${data.year}</p>
      <p class="header-employee">${escapeHtml(employeeName)}</p>
      <p class="header-mission">${escapeHtml(data.mission.title)}</p>
    </div>
  </header>

  <!-- ── Daily table ───────────────────────────────────────────────── -->
  <h2 class="section-title">Saisie journalière</h2>
  <table class="daily-table">
    <thead>
      <tr>
        <th>Jour</th>
        <th>Date</th>
        <th>Type</th>
        <th>Fraction</th>
        <th>Commentaire</th>
        <th>Projets</th>
      </tr>
    </thead>
    <tbody>
      ${buildDailyTableRows(data)}
    </tbody>
  </table>

  <!-- ── Summary ───────────────────────────────────────────────────── -->
  <h2 class="section-title">Récapitulatif du mois${overtimeBadge}</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <p class="summary-card-label">Jours travaillés</p>
      <p class="summary-card-value">${formatDecimal(data.summary.totalWorkDays)}<span class="summary-card-unit">j</span></p>
    </div>
    <div class="summary-card">
      <p class="summary-card-label">Jours de congé</p>
      <p class="summary-card-value">${formatDecimal(data.summary.totalLeaveDays)}<span class="summary-card-unit">j</span></p>
    </div>
    <div class="summary-card">
      <p class="summary-card-label">Jours ouvrés du mois</p>
      <p class="summary-card-value">${data.summary.workingDaysInMonth}<span class="summary-card-unit">j</span></p>
    </div>
  </div>

  <h3 style="font-size:11px;font-weight:600;color:#374151;margin-bottom:8px;">Soldes de congés</h3>
  <table class="leave-table">
    <thead>
      <tr>
        <th>Type</th>
        <th>Total</th>
        <th>Consommé</th>
        <th>Restant</th>
      </tr>
    </thead>
    <tbody>
      ${buildLeaveBalanceRows(data)}
    </tbody>
  </table>

  <!-- ── Signatures ─────────────────────────────────────────────────── -->
  <h2 class="section-title">Signatures</h2>
  <div class="signatures-row">
    ${buildSignatureZone('Salarié', data.signatures.employee.name, data.signatures.employee.signedAt)}
    ${buildSignatureZone('ESN', data.signatures.esn.name, data.signatures.esn.signedAt)}
    ${buildSignatureZone('Client', clientZoneName, clientZoneSignedAt)}
  </div>

  <!-- ── Project annex ──────────────────────────────────────────────── -->
  ${buildProjectAnnex(data)}

  <!-- ── Footer ─────────────────────────────────────────────────────── -->
  <footer class="footer">
    Généré le ${formatDate(new Date())} — ESN CRA App — Document confidentiel
  </footer>

</body>
</html>`;
}
