import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CraStatus, Role } from '@esn/shared-types';
import { SignatureActions } from './SignatureActions';

// Mock next-auth auth function used transitively
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock clientCraApi
vi.mock('../../lib/api/clientCra', () => ({
  clientCraApi: {
    submit: vi.fn(),
    retract: vi.fn(),
    signEmployee: vi.fn(),
    signEsn: vi.fn(),
    rejectEsn: vi.fn(),
    signClient: vi.fn(),
    rejectClient: vi.fn(),
  },
}));

describe('SignatureActions', () => {
  // ── T5 — DRAFT state for EMPLOYEE ─────────────────────────────────────────

  it('EMPLOYEE + DRAFT: does NOT render a "Soumettre" button', () => {
    render(
      <SignatureActions
        craMonthId="m1"
        status={CraStatus.DRAFT}
        userRole={Role.EMPLOYEE}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /soumettre/i })).toBeNull();
  });

  it('EMPLOYEE + DRAFT: renders a guidance message linking to /reports', () => {
    render(
      <SignatureActions
        craMonthId="m1"
        status={CraStatus.DRAFT}
        userRole={Role.EMPLOYEE}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/rapport mensuel/i)).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/reports');
  });

  // ── SUBMITTED state: existing buttons intact ───────────────────────────────

  it('EMPLOYEE + SUBMITTED: renders "Signer" and "Retirer la soumission" buttons', () => {
    render(
      <SignatureActions
        craMonthId="m1"
        status={CraStatus.SUBMITTED}
        userRole={Role.EMPLOYEE}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /signer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retirer/i })).toBeInTheDocument();
  });

  // ── Other roles unaffected ─────────────────────────────────────────────────

  it('ESN_ADMIN + SIGNED_EMPLOYEE: renders "Valider" and "Refuser" buttons', () => {
    render(
      <SignatureActions
        craMonthId="m1"
        status={CraStatus.SIGNED_EMPLOYEE}
        userRole={Role.ESN_ADMIN}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /valider/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refuser/i })).toBeInTheDocument();
  });
});
