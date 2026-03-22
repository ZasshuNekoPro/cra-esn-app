/**
 * T2 — SettingsPage: affiche le profil utilisateur (firstName, lastName, email, phone).
 * Page Server Component — on teste la logique de rendu via le composant exporté.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

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

  it('shows stub buttons for modify and change-password', async () => {
    const jsx = await SettingsPage();
    render(jsx);
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /changer.*mot de passe/i })).toBeInTheDocument();
  });

  it('fetches profile from /auth/me endpoint', async () => {
    await SettingsPage();
    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
  });
});
