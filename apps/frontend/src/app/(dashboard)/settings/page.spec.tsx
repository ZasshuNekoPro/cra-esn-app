/**
 * T2 — SettingsPage: fetches profile server-side and passes it to SettingsClient.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockAuth, mockApiClient } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockApiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../../../auth', () => ({
  auth: mockAuth,
}));

vi.mock('../../../lib/api/client', () => ({
  apiClient: mockApiClient,
}));

// Break next-auth/react → next/server import chain (pulled in by SettingsClient → clientFetch)
vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

// Stub client API — we test it separately in SettingsClient.spec.tsx
vi.mock('../../../lib/api/users', () => ({
  usersClientApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

// next/navigation redirect used in layout — stub it
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import SettingsPage from './page';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeSession = (overrides = {}) => ({
  user: { id: 'u1', email: 'alice@example.com', role: 'EMPLOYEE', name: 'Alice Dupont' },
  ...overrides,
});

const makeProfile = (overrides = {}) => ({
  id: 'u1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Dupont',
  role: 'EMPLOYEE',
  phone: '+33 6 12 34 56 78',
  avatarUrl: null,
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(makeSession());
    mockApiClient.get.mockResolvedValue(makeProfile());
  });

  it('renders the page title', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByRole('heading', { name: /paramètres/i })).toBeInTheDocument();
  });

  it('displays the employee first and last name', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Dupont/)).toBeInTheDocument();
  });

  it('displays the employee email', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('displays phone number when present', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByText('+33 6 12 34 56 78')).toBeInTheDocument();
  });

  it('displays "Non renseigné" when phone is null', async () => {
    mockApiClient.get.mockResolvedValue(makeProfile({ phone: null }));
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByText(/non renseigné/i)).toBeInTheDocument();
  });

  it('shows Modifier and Changer le mot de passe buttons', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByRole('button', { name: /^modifier$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /changer.*mot de passe/i })).toBeInTheDocument();
  });

  it('fetches profile from /auth/me endpoint', async () => {
    await SettingsPage();
    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
  });
});
