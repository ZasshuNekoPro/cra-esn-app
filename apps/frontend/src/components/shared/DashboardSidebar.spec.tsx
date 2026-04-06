import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSidebar } from './DashboardSidebar';
import { Role } from '@esn/shared-types';

// Next.js hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Server action for sign-out
vi.mock('./actions', () => ({
  signOutAction: vi.fn(),
}));

const baseUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

describe('DashboardSidebar — PLATFORM_ADMIN', () => {
  const user = { ...baseUser, role: Role.PLATFORM_ADMIN };

  it('bug #1 / #2 — should link to /platform/admin/dashboard (not /admin/dashboard)', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/platform/admin/dashboard');
  });

  it('bug #2 — should have a link to /platform/admin/users to manage ESN admins', () => {
    render(<DashboardSidebar user={user} />);
    const createLink = screen.getByRole('link', { name: 'Administrateurs ESN' });
    expect(createLink).toHaveAttribute('href', '/platform/admin/users');
  });

  it('should have a link to /platform/admin/esn to manage ESN companies', () => {
    render(<DashboardSidebar user={user} />);
    const esnLink = screen.getByRole('link', { name: 'Entreprises ESN' });
    expect(esnLink).toHaveAttribute('href', '/platform/admin/esn');
  });

  it('bug #3 — should NOT show "Validation & Rapports" tab for platform admin', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.queryByText('Validation & Rapports')).toBeNull();
  });
});

describe('DashboardSidebar — ESN_ADMIN', () => {
  const user = { ...baseUser, role: Role.ESN_ADMIN };

  it('should link to /esn/admin/dashboard (not /admin/dashboard)', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/esn/admin/dashboard');
  });

  it('should show Validation & Rapports for ESN_ADMIN', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText('Validation & Rapports')).toBeInTheDocument();
  });
});

describe('DashboardSidebar — ESN_MANAGER', () => {
  const user = { ...baseUser, role: Role.ESN_MANAGER };

  it('should link to /manager/dashboard', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/manager/dashboard');
  });

  it('should show Validation CRA for ESN_MANAGER', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText('Validation CRA')).toBeInTheDocument(); // manager garde l'onglet CRA distinct
  });

  it('should show Salariés, Clients, Missions links', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText('Salariés')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Missions')).toBeInTheDocument();
  });
});

describe('DashboardSidebar — EMPLOYEE', () => {
  const user = { ...baseUser, role: Role.EMPLOYEE };

  it('should link to /dashboard', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/dashboard');
  });

  it('should NOT show Validation & Rapports for employee', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.queryByText('Validation & Rapports')).toBeNull();
  });
});
