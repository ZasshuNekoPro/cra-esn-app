import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { CraMonthClient } from './CraMonthClient';
import { CraStatus, Role, CraEntryType } from '@esn/shared-types';
import type { CraMonth, CraEntry, CreateCraEntryRequest } from '@esn/shared-types';

// vi.hoisted ensures these are available inside vi.mock factories (which are hoisted)
const { mockRefresh, mockRevalidateCraAction, mockCreateEntry, mockUpdateEntry, mockDeleteEntry } =
  vi.hoisted(() => ({
    mockRefresh: vi.fn(),
    mockRevalidateCraAction: vi.fn().mockResolvedValue(undefined),
    mockCreateEntry: vi.fn(),
    mockUpdateEntry: vi.fn(),
    mockDeleteEntry: vi.fn().mockResolvedValue(undefined),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('../../app/(dashboard)/cra/[year]/[month]/actions', () => ({
  revalidateCraAction: mockRevalidateCraAction,
}));

vi.mock('../../lib/api/clientCra', () => ({
  clientCraApi: {
    createEntry: mockCreateEntry,
    updateEntry: mockUpdateEntry,
    deleteEntry: mockDeleteEntry,
  },
}));

// Mock child components with simplified implementations that expose the necessary handlers
vi.mock('./MonthGrid', () => ({
  MonthGrid: ({ onDayClick }: { onDayClick: (d: Date) => void }) => (
    <button data-testid="day-btn" onClick={() => onDayClick(new Date(2026, 3, 10))} />
  ),
}));

vi.mock('./EntryModal', () => ({
  EntryModal: ({ onSave, onDelete, isOpen }: {
    onSave: (d: CreateCraEntryRequest) => void;
    onDelete?: () => void;
    isOpen: boolean
  }) =>
    isOpen ? (
      <div>
        <button
          data-testid="save-btn"
          onClick={() => onSave({
            date: '2026-04-10',
            entryType: CraEntryType.WORK_ONSITE,
            dayFraction: 1
          })}
        />
        {onDelete && <button data-testid="delete-btn" onClick={onDelete} />}
      </div>
    ) : null,
}));

vi.mock('./SignatureActions', () => ({
  SignatureActions: ({ onStatusChange }: { onStatusChange: (s: CraStatus) => void }) => (
    <button data-testid="status-btn" onClick={() => onStatusChange(CraStatus.SUBMITTED)} />
  ),
}));

vi.mock('./CraStatusBadge', () => ({ CraStatusBadge: () => null }));
vi.mock('./EntryTypeLegend', () => ({ EntryTypeLegend: () => null }));

// Mock next-auth
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Test data
const STUB_CRA_MONTH: CraMonth = {
  id: 'cra-1',
  year: 2026,
  month: 4,
  status: CraStatus.DRAFT,
  pdfUrl: null,
  submittedAt: null,
  lockedAt: null,
  signedByEmployeeAt: null,
  signedByEsnAt: null,
  signedByClientAt: null,
  rejectionComment: null,
  employeeId: 'user-1',
  missionId: 'mission-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const STUB_ENTRY: CraEntry = {
  id: 'entry-1',
  date: new Date(2026, 3, 10), // April 10
  entryType: CraEntryType.WORK_ONSITE,
  dayFraction: 1,
  comment: null,
  craMonthId: 'cra-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CraMonthClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEntry.mockResolvedValue({ ...STUB_ENTRY, id: 'entry-new' });
    mockUpdateEntry.mockResolvedValue(STUB_ENTRY);
  });

  it('should call revalidateCraAction with correct year/month when saving a new entry', async () => {
    render(
      <CraMonthClient
        craMonth={STUB_CRA_MONTH}
        initialEntries={[]}
        publicHolidayDates={[]}
        userRole={Role.EMPLOYEE}
      />,
    );

    // Click day to open modal
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="day-btn"]') as HTMLElement
    ));

    // Click save to trigger handleSave
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="save-btn"]') as HTMLElement
    ));

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalled();
      expect(mockRevalidateCraAction).toHaveBeenCalledWith(2026, 4);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should call revalidateCraAction with correct year/month when updating an existing entry', async () => {
    render(
      <CraMonthClient
        craMonth={STUB_CRA_MONTH}
        initialEntries={[STUB_ENTRY]}
        publicHolidayDates={[]}
        userRole={Role.EMPLOYEE}
      />,
    );

    // Click day to open modal (will find existing entry for April 10)
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="day-btn"]') as HTMLElement
    ));

    // Click save to trigger handleSave (update path)
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="save-btn"]') as HTMLElement
    ));

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalled();
      expect(mockRevalidateCraAction).toHaveBeenCalledWith(2026, 4);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should call revalidateCraAction with correct year/month when deleting an entry', async () => {
    render(
      <CraMonthClient
        craMonth={STUB_CRA_MONTH}
        initialEntries={[STUB_ENTRY]}
        publicHolidayDates={[]}
        userRole={Role.EMPLOYEE}
      />,
    );

    // Click day to open modal (will find existing entry for April 10)
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="day-btn"]') as HTMLElement
    ));

    // Click delete to trigger handleDelete
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="delete-btn"]') as HTMLElement
    ));

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockDeleteEntry).toHaveBeenCalledWith('cra-1', 'entry-1');
      expect(mockRevalidateCraAction).toHaveBeenCalledWith(2026, 4);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should call revalidateCraAction with correct year/month when changing status', async () => {
    render(
      <CraMonthClient
        craMonth={STUB_CRA_MONTH}
        initialEntries={[]}
        publicHolidayDates={[]}
        userRole={Role.EMPLOYEE}
      />,
    );

    // Click status button to trigger handleStatusChange
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="status-btn"]') as HTMLElement
    ));

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockRevalidateCraAction).toHaveBeenCalledWith(2026, 4);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('should not call revalidateCraAction if handleDelete is called without selected entry', async () => {
    render(
      <CraMonthClient
        craMonth={STUB_CRA_MONTH}
        initialEntries={[]}
        publicHolidayDates={[]}
        userRole={Role.EMPLOYEE}
      />,
    );

    // Click day to open modal (no existing entry)
    fireEvent.click(await waitFor(() =>
      document.querySelector('[data-testid="day-btn"]') as HTMLElement
    ));

    // Since there's no existing entry for April 10, delete button should not be rendered
    const deleteBtn = document.querySelector('[data-testid="delete-btn"]');
    expect(deleteBtn).toBeNull();

    // Verify revalidate was not called
    expect(mockRevalidateCraAction).not.toHaveBeenCalled();
    expect(mockDeleteEntry).not.toHaveBeenCalled();
  });
});