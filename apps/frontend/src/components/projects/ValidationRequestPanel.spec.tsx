'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationRequestPanel } from './ValidationRequestPanel';
import { ValidationStatus, Role } from '@esn/shared-types';
import type { ProjectValidationRequest } from '@esn/shared-types';

const { mockCreateValidation, mockApproveValidation, mockRejectValidation } = vi.hoisted(() => ({
  mockCreateValidation: vi.fn(),
  mockApproveValidation: vi.fn(),
  mockRejectValidation: vi.fn(),
}));

vi.mock('../../lib/api/clientProjects', () => ({
  clientProjectsApi: {
    createValidation: mockCreateValidation,
    approveValidation: mockApproveValidation,
    rejectValidation: mockRejectValidation,
  },
}));

const PENDING_ESN: ProjectValidationRequest = {
  id: 'val-1',
  title: 'Revue sprint 1',
  description: 'Validation du livrable',
  targetRole: Role.ESN_ADMIN,
  status: ValidationStatus.PENDING,
  decisionComment: null,
  requestedAt: new Date().toISOString(),
  resolvedAt: null,
  projectId: 'proj-1',
  requestedById: 'emp-1',
  resolverId: null,
};

const PENDING_CLIENT: ProjectValidationRequest = {
  ...PENDING_ESN,
  id: 'val-2',
  targetRole: Role.CLIENT,
};

describe('ValidationRequestPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('role-based rendering', () => {
    it('shows create button for EMPLOYEE', () => {
      render(<ValidationRequestPanel projectId="proj-1" initialValidations={[]} userRole={Role.EMPLOYEE} />);
      expect(screen.getByText(/Créer une demande de validation/)).toBeInTheDocument();
    });

    it('does not show create button for ESN_ADMIN', () => {
      render(<ValidationRequestPanel projectId="proj-1" initialValidations={[]} userRole={Role.ESN_ADMIN} />);
      expect(screen.queryByText(/Créer une demande de validation/)).toBeNull();
    });

    it('shows empty state when no validations', () => {
      render(<ValidationRequestPanel projectId="proj-1" initialValidations={[]} userRole={Role.EMPLOYEE} />);
      expect(screen.getByText(/Aucune demande de validation/)).toBeInTheDocument();
    });
  });

  describe('canDecide — decide buttons visibility', () => {
    it('shows Approuver/Refuser for ESN_ADMIN on ESN_ADMIN-targeted validation', () => {
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_ADMIN} />,
      );
      expect(screen.getByText('Approuver')).toBeInTheDocument();
      expect(screen.getByText('Refuser')).toBeInTheDocument();
    });

    it('shows Approuver/Refuser for ESN_MANAGER on ESN_ADMIN-targeted validation', () => {
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_MANAGER} />,
      );
      expect(screen.getByText('Approuver')).toBeInTheDocument();
    });

    it('does NOT show decide buttons for CLIENT on ESN_ADMIN-targeted validation', () => {
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.CLIENT} />,
      );
      expect(screen.queryByText('Approuver')).toBeNull();
    });

    it('shows decide buttons for CLIENT on CLIENT-targeted validation', () => {
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_CLIENT]} userRole={Role.CLIENT} />,
      );
      expect(screen.getByText('Approuver')).toBeInTheDocument();
    });

    it('does NOT show decide buttons for ESN_ADMIN on CLIENT-targeted validation', () => {
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_CLIENT]} userRole={Role.ESN_ADMIN} />,
      );
      expect(screen.queryByText('Approuver')).toBeNull();
    });

    it('does NOT show decide buttons for APPROVED validation', () => {
      const approved = { ...PENDING_ESN, status: ValidationStatus.APPROVED };
      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[approved]} userRole={Role.ESN_ADMIN} />,
      );
      expect(screen.queryByText('Approuver')).toBeNull();
    });
  });

  describe('createValidation flow', () => {
    it('submits form and adds new validation to list', async () => {
      const created: ProjectValidationRequest = {
        ...PENDING_ESN,
        id: 'val-new',
        title: 'Nouvelle demande',
      };
      mockCreateValidation.mockResolvedValueOnce(created);

      render(<ValidationRequestPanel projectId="proj-1" initialValidations={[]} userRole={Role.EMPLOYEE} />);

      fireEvent.click(screen.getByText(/Créer une demande de validation/));
      fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'Nouvelle demande' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'desc' } });
      fireEvent.click(screen.getByText('Envoyer'));

      await waitFor(() => expect(screen.getByText('Nouvelle demande')).toBeInTheDocument());
      expect(mockCreateValidation).toHaveBeenCalledWith('proj-1', expect.objectContaining({ title: 'Nouvelle demande' }));
    });

    it('shows error message when createValidation fails', async () => {
      mockCreateValidation.mockRejectedValueOnce(new Error('Erreur serveur'));

      render(<ValidationRequestPanel projectId="proj-1" initialValidations={[]} userRole={Role.EMPLOYEE} />);

      fireEvent.click(screen.getByText(/Créer une demande de validation/));
      fireEvent.change(screen.getByLabelText(/Titre/i), { target: { value: 'X' } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Y' } });
      fireEvent.click(screen.getByText('Envoyer'));

      await waitFor(() => expect(screen.getByText('Erreur serveur')).toBeInTheDocument());
    });
  });

  describe('approveValidation / rejectValidation flow', () => {
    it('calls approveValidation and updates status in UI', async () => {
      const approved: ProjectValidationRequest = {
        ...PENDING_ESN,
        status: ValidationStatus.APPROVED,
        decisionComment: 'OK',
      };
      mockApproveValidation.mockResolvedValueOnce(approved);

      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_ADMIN} />,
      );

      fireEvent.click(screen.getByText('Approuver'));

      await waitFor(() => expect(screen.getByText('Approuvé')).toBeInTheDocument());
      expect(mockApproveValidation).toHaveBeenCalledWith('proj-1', 'val-1', expect.any(Object));
    });

    it('calls rejectValidation and updates status in UI', async () => {
      const rejected: ProjectValidationRequest = {
        ...PENDING_ESN,
        status: ValidationStatus.REJECTED,
      };
      mockRejectValidation.mockResolvedValueOnce(rejected);

      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_ADMIN} />,
      );

      fireEvent.click(screen.getByText('Refuser'));

      await waitFor(() => expect(screen.getByText('Refusé')).toBeInTheDocument());
    });

    it('shows error message when approveValidation fails', async () => {
      mockApproveValidation.mockRejectedValueOnce(new Error('Non autorisé'));

      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_ADMIN} />,
      );

      fireEvent.click(screen.getByText('Approuver'));

      await waitFor(() => expect(screen.getByText('Non autorisé')).toBeInTheDocument());
    });

    it('ignores second click while request is in flight (double-click guard)', async () => {
      let resolveApprove!: (v: ProjectValidationRequest) => void;
      mockApproveValidation.mockReturnValueOnce(
        new Promise<ProjectValidationRequest>((resolve) => { resolveApprove = resolve; }),
      );

      render(
        <ValidationRequestPanel projectId="proj-1" initialValidations={[PENDING_ESN]} userRole={Role.ESN_ADMIN} />,
      );

      const approveBtn = screen.getByText('Approuver');
      fireEvent.click(approveBtn);
      fireEvent.click(approveBtn);
      fireEvent.click(approveBtn);

      resolveApprove({ ...PENDING_ESN, status: ValidationStatus.APPROVED });

      await waitFor(() => expect(screen.getByText('Approuvé')).toBeInTheDocument());
      expect(mockApproveValidation).toHaveBeenCalledTimes(1);
    });
  });
});
