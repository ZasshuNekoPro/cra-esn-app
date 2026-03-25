/**
 * T1 — LoginPage: signIn doit être importé depuis 'next-auth/react' (client-side)
 * et non depuis '../../../auth' (server-side).
 *
 * Ces tests vérifient le comportement visible du composant : soumission
 * d'un formulaire, affichage des erreurs, redirection après succès.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockSignIn, mockRouterPush } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockRouterPush: vi.fn(),
}));

// Mock next-auth/react — doit être l'import utilisé par LoginPage
vi.mock('next-auth/react', () => ({
  signIn: mockSignIn,
}));

// Mock next/navigation
const { mockSearchParamsGet } = vi.hoisted(() => ({
  mockSearchParamsGet: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

// S'assurer que l'ancien import server-side n'est PAS utilisé
vi.mock('../../../auth', () => ({
  signIn: vi.fn(() => { throw new Error('Server-side signIn appelé dans un Client Component !'); }),
}));

import LoginPage from './page';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null); // no callbackUrl by default
  });

  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('calls next-auth/react signIn with credentials on submit', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/adresse email/i), {
      target: { value: 'admin@esn-corp.local' },
    });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'admin@esn-corp.local',
        password: 'password123',
        redirect: false,
      });
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on wrong credentials', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/identifiants incorrects/i);
    });
  });

  // ── T1 nouveaux cas ────────────────────────────────────────────────────────

  it('shows error when signIn returns { ok: false, error: undefined }', async () => {
    // Cas clé T1 : NextAuth v5 peut retourner ok=false sans error string
    mockSignIn.mockResolvedValue({ ok: false, error: undefined });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  it('shows error when signIn returns null', async () => {
    mockSignIn.mockResolvedValue(null);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  it('redirects to callbackUrl when provided in search params', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === 'callbackUrl' ? '/cra/2026/3' : null,
    );

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/cra/2026/3');
    });
  });

  it('redirects to /dashboard when no callbackUrl', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });
    mockSearchParamsGet.mockReturnValue(null);

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('does NOT call server-side signIn from ../../../auth', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: undefined });

    const { signIn: serverSignIn } = await import('../../../auth');

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form')!);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(serverSignIn).not.toHaveBeenCalled();
  });
});
