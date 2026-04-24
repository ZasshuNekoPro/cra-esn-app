import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SentReportHistoryItem } from '@esn/shared-types';

// Break the next-auth/react → next/server import chain (static + dynamic)
vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

// SentReportsTable uses clientApiFetch directly (not reportsApi)
const { mockClientApiFetch } = vi.hoisted(() => ({ mockClientApiFetch: vi.fn() }));
vi.mock('../../lib/api/clientFetch', () => ({
  clientApiFetch: mockClientApiFetch,
}));

import { SentReportsTable } from './SentReportsTable';

function makeItem(overrides: Partial<SentReportHistoryItem> = {}): SentReportHistoryItem {
  return {
    id: 'audit-1',
    sentAt: '2026-03-15T10:00:00.000Z',
    year: 2026,
    month: 3,
    reportType: 'CRA_ONLY',
    sentTo: ['ESN'],
    skippedRecipients: [],
    validations: [],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SentReportsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub URL APIs not available in jsdom
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it('renders empty state when no items', () => {
    render(<SentReportsTable items={[]} />);
    expect(screen.getByText(/aucun rapport/i)).toBeInTheDocument();
  });

  // ── Row rendering ──────────────────────────────────────────────────────────

  it('renders a row with date, period, type and recipients', () => {
    render(<SentReportsTable items={[makeItem()]} />);

    expect(screen.getByText(/mars 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/CRA uniquement/i)).toBeInTheDocument();
    expect(screen.getByText(/ESN/i)).toBeInTheDocument();
  });

  // ── Validation badges ──────────────────────────────────────────────────────

  it('shows "—" in validation column when no validations', () => {
    render(<SentReportsTable items={[makeItem({ validations: [] })]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows PENDING badge for a pending validation', () => {
    const item = makeItem({
      validations: [
        {
          id: 'rvr-1',
          token: 'tok-1',
          recipient: 'ESN',
          status: 'PENDING',
          comment: null,
          resolvedBy: null,
          resolvedAt: null,
          expiresAt: '2026-03-17T10:00:00.000Z',
          createdAt: '2026-03-15T10:00:00.000Z',
        },
      ],
    });
    render(<SentReportsTable items={[item]} />);
    expect(screen.getByText(/ESN — En attente/i)).toBeInTheDocument();
  });

  it('shows VALIDATED badge for a validated request', () => {
    const item = makeItem({
      validations: [
        {
          id: 'rvr-1',
          token: 'tok-1',
          recipient: 'ESN',
          status: 'VALIDATED',
          comment: null,
          resolvedBy: 'Marie Dir',
          resolvedAt: '2026-03-16T09:00:00.000Z',
          expiresAt: '2026-03-17T10:00:00.000Z',
          createdAt: '2026-03-15T10:00:00.000Z',
        },
      ],
    });
    render(<SentReportsTable items={[item]} />);
    expect(screen.getByText(/ESN — Validé/i)).toBeInTheDocument();
  });

  it('shows REFUSED badge with tooltip on refused validation', () => {
    const item = makeItem({
      validations: [
        {
          id: 'rvr-1',
          token: 'tok-1',
          recipient: 'CLIENT',
          status: 'REFUSED',
          comment: 'Données incorrectes',
          resolvedBy: 'Paul Client',
          resolvedAt: '2026-03-16T09:00:00.000Z',
          expiresAt: '2026-03-17T10:00:00.000Z',
          createdAt: '2026-03-15T10:00:00.000Z',
        },
      ],
    });
    render(<SentReportsTable items={[item]} />);
    expect(screen.getByText(/Client — Refusé/i)).toBeInTheDocument();
    expect(screen.getByText('(?)')).toBeInTheDocument();
  });

  // ── Download button ────────────────────────────────────────────────────────

  it('renders a download PDF button', () => {
    render(<SentReportsTable items={[makeItem()]} />);
    expect(screen.getByRole('button', { name: /télécharger/i })).toBeInTheDocument();
  });

  it('calls clientApiFetch with the correct download URL on PDF button click', async () => {
    const mockUrl = 'https://s3.example.com/presigned-url?token=abc';
    mockClientApiFetch.mockResolvedValueOnce({ url: mockUrl });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(['pdf content'], { type: 'application/pdf' })),
    });

    render(<SentReportsTable items={[makeItem({ id: 'audit-42' })]} />);

    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }));

    await waitFor(() => {
      expect(mockClientApiFetch).toHaveBeenCalledWith('/reports/sent-history/audit-42/download');
    });
  });
});
