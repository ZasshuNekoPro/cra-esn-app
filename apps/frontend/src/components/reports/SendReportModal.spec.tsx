import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SendReportResponse } from '@esn/shared-types';

// Mock useSendReport hook
vi.mock('../../hooks/useSendReport', () => ({
  useSendReport: vi.fn(),
}));

import { SendReportModal } from './SendReportModal';
import { useSendReport } from '../../hooks/useSendReport';

const mockedUseSendReport = vi.mocked(useSendReport);

function makeMutate(impl?: (payload: unknown) => void) {
  return vi.fn(impl ?? (() => undefined));
}

function makeHookResult(overrides: Partial<ReturnType<typeof useSendReport>> = {}) {
  return {
    mutate: makeMutate(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useSendReport>;
}

function renderModal(year = 2026, month = 3, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SendReportModal year={year} month={month} onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe('SendReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseSendReport.mockReturnValue(makeHookResult());
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders step 1 with report type options by default', () => {
    renderModal();

    expect(screen.getByText(/envoyer le rapport/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CRA uniquement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CRA \+ météo/i)).toBeInTheDocument();
  });

  it('renders step 2 when "Suivant" is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    expect(screen.getByLabelText(/ESN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Client/i)).toBeInTheDocument();
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  it('"Retour" on step 2 goes back to step 1', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));

    expect(screen.getByLabelText(/CRA uniquement/i)).toBeInTheDocument();
  });

  it('"Annuler" calls onClose', () => {
    const onClose = vi.fn();
    renderModal(2026, 3, onClose);

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── Submission ───────────────────────────────────────────────────────────

  it('calls mutate with correct payload when form is submitted', () => {
    const mutate = makeMutate();
    mockedUseSendReport.mockReturnValue(makeHookResult({ mutate }));

    renderModal(2026, 3);

    // Step 1: select CRA_WITH_WEATHER
    fireEvent.click(screen.getByLabelText(/CRA \+ météo/i));
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    // Step 2: check ESN (default)
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }));

    expect(mutate).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      reportType: 'CRA_WITH_WEATHER',
      recipients: expect.arrayContaining(['ESN']),
    });
  });

  it('disables submit button when no recipient is checked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    // Uncheck ESN
    fireEvent.click(screen.getByLabelText(/ESN/i));

    const submitBtn = screen.getByRole('button', { name: /envoyer/i });
    expect(submitBtn).toBeDisabled();
  });

  // ── States ────────────────────────────────────────────────────────────────

  it('shows loading state while isPending', () => {
    mockedUseSendReport.mockReturnValue(makeHookResult({ isPending: true }));

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

    expect(screen.getByRole('button', { name: /envoi/i })).toBeDisabled();
  });

  it('shows success message on isSuccess', () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/test.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: [],
    };
    mockedUseSendReport.mockReturnValue(
      makeHookResult({ isSuccess: true, data: mockResponse }),
    );

    renderModal();

    expect(screen.getByText(/rapport envoyé/i)).toBeInTheDocument();
  });

  it('shows skipped warning when skippedRecipients is non-empty', () => {
    const mockResponse: SendReportResponse = {
      success: true,
      sentTo: ['ESN'],
      pdfS3Key: 'reports/test.pdf',
      auditLogId: 'audit-1',
      skippedRecipients: ['CLIENT'],
    };
    mockedUseSendReport.mockReturnValue(
      makeHookResult({ isSuccess: true, data: mockResponse }),
    );

    renderModal();

    expect(screen.getByText(/client/i)).toBeInTheDocument();
    expect(screen.getByText(/ignoré|non configuré/i)).toBeInTheDocument();
  });

  it('shows error message on isError', () => {
    mockedUseSendReport.mockReturnValue(
      makeHookResult({ isError: true, error: new Error('Erreur réseau') }),
    );

    renderModal();

    expect(screen.getByText(/erreur réseau/i)).toBeInTheDocument();
  });
});
