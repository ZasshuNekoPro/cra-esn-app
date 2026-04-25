import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockReportsApi } = vi.hoisted(() => ({
  mockReportsApi: { listForEsn: vi.fn() },
}));

vi.mock('../../../../../lib/api/reports', () => ({
  reportsApi: mockReportsApi,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import AdminDashboardPage from './page';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeItem = (status: string) => ({
  id: `item-${Math.random()}`,
  token: 'tok',
  recipient: 'ESN' as const,
  status,
  comment: null,
  resolvedBy: null,
  resolvedAt: null,
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  year: 2026,
  month: 3,
  reportType: 'CRA_ONLY' as const,
  employeeId: 'emp-1',
  employeeName: 'Alice Dupont',
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows 0 when no reports are pending', async () => {
    mockReportsApi.listForEsn.mockResolvedValue([makeItem('VALIDATED'), makeItem('ARCHIVED')]);
    render(await AdminDashboardPage());
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /voir les validations/i })).not.toBeInTheDocument();
  });

  it('shows the correct pending count and link when reports are pending', async () => {
    mockReportsApi.listForEsn.mockResolvedValue([
      makeItem('PENDING'),
      makeItem('PENDING'),
      makeItem('VALIDATED'),
    ]);
    render(await AdminDashboardPage());
    expect(screen.getByText('2')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /voir les validations/i });
    expect(link).toHaveAttribute('href', '/esn/admin/reports');
  });

  it('shows "—" when the API call fails', async () => {
    mockReportsApi.listForEsn.mockRejectedValue(new Error('Network error'));
    render(await AdminDashboardPage());
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /voir les validations/i })).not.toBeInTheDocument();
  });

  it('fetches from listForEsn endpoint', async () => {
    mockReportsApi.listForEsn.mockResolvedValue([]);
    await AdminDashboardPage();
    expect(mockReportsApi.listForEsn).toHaveBeenCalledOnce();
  });

  it('label reads "Rapports en attente de validation"', async () => {
    mockReportsApi.listForEsn.mockResolvedValue([]);
    render(await AdminDashboardPage());
    expect(screen.getByText('Rapports en attente de validation')).toBeInTheDocument();
  });
});
