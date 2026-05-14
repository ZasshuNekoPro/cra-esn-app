import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Break next-auth/react import chain
vi.mock('next-auth/react', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

const { mockUpdateProfile, mockChangePassword } = vi.hoisted(() => ({
  mockUpdateProfile: vi.fn(),
  mockChangePassword: vi.fn(),
}));

vi.mock('../../../lib/api/users', () => ({
  usersClientApi: {
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
  },
}));

import { SettingsClient } from './SettingsClient';

const baseProfile = {
  id: 'u1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Dupont',
  role: 'EMPLOYEE',
  phone: '+33 6 12 34 56 78',
  avatarUrl: null,
};

describe('SettingsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── View mode ────────────────────────────────────────────────────────────────

  it('renders profile data in view mode', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Dupont')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('+33 6 12 34 56 78')).toBeInTheDocument();
  });

  it('shows "Non renseigné" when phone is null', () => {
    render(<SettingsClient initialProfile={{ ...baseProfile, phone: null }} />);
    expect(screen.getByText(/non renseigné/i)).toBeInTheDocument();
  });

  it('shows Modifier and Changer le mot de passe buttons in view mode', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /changer.*mot de passe/i })).toBeInTheDocument();
  });

  // ── Edit profile mode ────────────────────────────────────────────────────────

  it('shows profile form after clicking Modifier', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/téléphone/i)).toBeInTheDocument();
  });

  it('pre-fills profile form with current values', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
    expect(screen.getByLabelText<HTMLInputElement>(/prénom/i).value).toBe('Alice');
    expect(screen.getByLabelText<HTMLInputElement>(/^nom/i).value).toBe('Dupont');
  });

  it('cancels edit and returns to view mode', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByLabelText(/prénom/i)).not.toBeInTheDocument();
  });

  it('calls updateProfile and returns to view on success', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      ...baseProfile,
      firstName: 'Alicia',
    });
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));

    const firstNameInput = screen.getByLabelText<HTMLInputElement>(/prénom/i);
    fireEvent.change(firstNameInput, { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Alicia' }),
      );
    });
  });

  it('shows validation error when firstName is empty', async () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));

    const firstNameInput = screen.getByLabelText<HTMLInputElement>(/prénom/i);
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/prénom.*requis/i)).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows API error message on updateProfile failure', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('Erreur serveur'));
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/erreur serveur/i)).toBeInTheDocument();
  });

  // ── Change password mode ─────────────────────────────────────────────────────

  it('shows password form after clicking Changer le mot de passe', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));
    expect(screen.getByLabelText(/mot de passe actuel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer/i)).toBeInTheDocument();
  });

  it('cancels password change and returns to view mode', () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
    expect(screen.queryByLabelText(/mot de passe actuel/i)).not.toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));

    fireEvent.change(screen.getByLabelText(/mot de passe actuel/i), { target: { value: 'ancien123' } });
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'nouveau123' } });
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'nouveau456' } });
    fireEvent.click(screen.getByRole('button', { name: /modifier le mot de passe/i }));

    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('shows error when new password is too short', async () => {
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));

    fireEvent.change(screen.getByLabelText(/mot de passe actuel/i), { target: { value: 'ancien123' } });
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'court' } });
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: /modifier le mot de passe/i }));

    expect(await screen.findByText(/8 caractères/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('calls changePassword with correct payload', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));

    fireEvent.change(screen.getByLabelText(/mot de passe actuel/i), { target: { value: 'ancien123' } });
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'nouveau123' } });
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'nouveau123' } });
    fireEvent.click(screen.getByRole('button', { name: /modifier le mot de passe/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'ancien123',
        newPassword: 'nouveau123',
      });
    });
  });

  it('shows API error on changePassword failure', async () => {
    mockChangePassword.mockRejectedValueOnce(new Error('Mot de passe actuel incorrect'));
    render(<SettingsClient initialProfile={baseProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /changer.*mot de passe/i }));

    fireEvent.change(screen.getByLabelText(/mot de passe actuel/i), { target: { value: 'mauvais' } });
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'nouveau123' } });
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'nouveau123' } });
    fireEvent.click(screen.getByRole('button', { name: /modifier le mot de passe/i }));

    expect(await screen.findByText(/mot de passe actuel incorrect/i)).toBeInTheDocument();
  });
});
