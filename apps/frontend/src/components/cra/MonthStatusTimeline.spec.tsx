/**
 * T4 — MonthStatusTimeline : en statut DRAFT, doit afficher "CRA non soumis"
 * (et pas seulement "En attente" sur toutes les étapes).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CraStatus } from '@esn/shared-types';
import { MonthStatusTimeline } from './MonthStatusTimeline';

const defaultProps = {
  signedByEmployeeAt: null,
  signedByEsnAt: null,
  signedByClientAt: null,
  rejectionComment: null,
};

describe('MonthStatusTimeline', () => {
  it('DRAFT: displays "CRA non soumis" message', () => {
    render(<MonthStatusTimeline status={CraStatus.DRAFT} {...defaultProps} />);
    expect(screen.getByText(/CRA non encore soumis/i)).toBeInTheDocument();
  });

  it('SUBMITTED: does not display "CRA non soumis" message', () => {
    render(<MonthStatusTimeline status={CraStatus.SUBMITTED} {...defaultProps} />);
    expect(screen.queryByText(/CRA non encore soumis/i)).not.toBeInTheDocument();
  });

  it('SIGNED_EMPLOYEE: shows green checkmark for first step', () => {
    render(
      <MonthStatusTimeline
        status={CraStatus.SIGNED_EMPLOYEE}
        signedByEmployeeAt="2026-03-15T10:00:00.000Z"
        signedByEsnAt={null}
        signedByClientAt={null}
        rejectionComment={null}
      />,
    );
    expect(screen.getByLabelText(/salarié — signé/i)).toBeInTheDocument();
  });

  it('DRAFT: all steps show "En attente"', () => {
    render(<MonthStatusTimeline status={CraStatus.DRAFT} {...defaultProps} />);
    const pending = screen.getAllByText(/en attente/i);
    expect(pending.length).toBeGreaterThanOrEqual(3);
  });

  it('displays rejection comment when rejected', () => {
    render(
      <MonthStatusTimeline
        status={CraStatus.DRAFT}
        {...defaultProps}
        rejectionComment="Entrées manquantes sur semaine 12"
      />,
    );
    expect(screen.getByText(/Entrées manquantes sur semaine 12/)).toBeInTheDocument();
  });
});
