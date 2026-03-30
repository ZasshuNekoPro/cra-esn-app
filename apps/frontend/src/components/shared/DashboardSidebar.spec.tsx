import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  it('bug #2 — should have a link to /platform/admin/users to create ESN', () => {
    render(<DashboardSidebar user={user} />);
    const createLink = screen.getByRole('link', { name: /ESN/i });
    expect(createLink).toHaveAttribute('href', '/platform/admin/users');
  });

  it('bug #3 — should NOT show "Validation CRA" tab for platform admin', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.queryByText('Validation CRA')).toBeNull();
  });
});

describe('DashboardSidebar — ESN_ADMIN', () => {
  const user = { ...baseUser, role: Role.ESN_ADMIN };

  it('should link to /esn/admin/dashboard (not /admin/dashboard)', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/esn/admin/dashboard');
  });

  it('should show Validation CRA for ESN_ADMIN', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.getByText('Validation CRA')).toBeInTheDocument();
  });
});

describe('DashboardSidebar — EMPLOYEE', () => {
  const user = { ...baseUser, role: Role.EMPLOYEE };

  it('should link to /dashboard', () => {
    render(<DashboardSidebar user={user} />);
    const dashLink = screen.getByRole('link', { name: 'Tableau de bord' });
    expect(dashLink).toHaveAttribute('href', '/dashboard');
  });

  it('should NOT show Validation CRA for employee', () => {
    render(<DashboardSidebar user={user} />);
    expect(screen.queryByText('Validation CRA')).toBeNull();
  });
});
