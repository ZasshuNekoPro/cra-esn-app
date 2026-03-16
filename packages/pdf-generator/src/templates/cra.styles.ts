export const craStyles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11px;
    color: #1f2937;
    line-height: 1.5;
    padding: 24px 32px;
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }

  .header-title {
    font-size: 20px;
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 4px;
  }

  .header-subtitle {
    font-size: 13px;
    color: #6b7280;
  }

  .header-meta {
    text-align: right;
  }

  .header-period {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .header-employee {
    font-size: 12px;
    color: #374151;
    margin-top: 4px;
  }

  .header-mission {
    font-size: 12px;
    color: #6b7280;
    font-style: italic;
  }

  /* ── Section titles ──────────────────────────────────────────────────── */
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1d4ed8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #bfdbfe;
    padding-bottom: 4px;
    margin-bottom: 12px;
    margin-top: 24px;
  }

  /* ── Daily table ─────────────────────────────────────────────────────── */
  .daily-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  .daily-table th {
    background-color: #1d4ed8;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 6px 8px;
    text-align: left;
  }

  .daily-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }

  .daily-table tbody tr:hover {
    filter: brightness(0.97);
  }

  .day-name {
    color: #6b7280;
    font-size: 10px;
  }

  .project-tag {
    display: inline-block;
    background-color: #e0e7ff;
    color: #3730a3;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 9px;
    margin-right: 2px;
  }

  /* ── Summary ─────────────────────────────────────────────────────────── */
  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .summary-card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 14px;
    background-color: #f9fafb;
  }

  .summary-card-label {
    font-size: 10px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }

  .summary-card-value {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
  }

  .summary-card-unit {
    font-size: 10px;
    color: #9ca3af;
    margin-left: 2px;
  }

  .overtime-badge {
    display: inline-block;
    background-color: #fee2e2;
    color: #991b1b;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 8px;
  }

  /* Leave balance table */
  .leave-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .leave-table th {
    background-color: #f3f4f6;
    font-size: 10px;
    font-weight: 600;
    color: #374151;
    padding: 5px 8px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  .leave-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #f3f4f6;
  }

  .leave-remaining {
    font-weight: 600;
    color: #059669;
  }

  /* ── Signatures ──────────────────────────────────────────────────────── */
  .signatures-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }

  .signature-zone {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 14px;
    min-height: 100px;
    background-color: #fafafa;
  }

  .signature-zone-title {
    font-size: 11px;
    font-weight: 700;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 8px;
  }

  .signature-zone-name {
    font-size: 12px;
    color: #1f2937;
    margin-bottom: 6px;
  }

  .signature-status-signed {
    font-size: 11px;
    color: #059669;
    font-weight: 600;
  }

  .signature-status-pending {
    font-size: 11px;
    color: #9ca3af;
    font-style: italic;
  }

  .signature-date {
    font-size: 10px;
    color: #6b7280;
    margin-top: 2px;
  }

  /* ── Project annex ───────────────────────────────────────────────────── */
  .project-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .project-table th {
    background-color: #1d4ed8;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    padding: 6px 8px;
    text-align: left;
  }

  .project-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  .project-table tbody tr:nth-child(even) td {
    background-color: #f9fafb;
  }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 9px;
    color: #9ca3af;
    text-align: center;
  }
`;
