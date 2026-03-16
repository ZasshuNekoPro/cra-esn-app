import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LeaveBalanceSummary } from './LeaveBalanceSummary';

describe('LeaveBalanceSummary', () => {
  const defaultBalances = [
    { leaveType: 'PAID_LEAVE', totalDays: 25, usedDays: 10 },
    { leaveType: 'RTT', totalDays: 12, usedDays: 4 },
  ];

  it('should display usedDays / totalDays for PAID_LEAVE', () => {
    render(<LeaveBalanceSummary balances={defaultBalances} />);
    const rows = screen.getAllByRole('row');
    // row[0] is header, row[1] is PAID_LEAVE
    const paidLeaveRow = rows[1];
    expect(within(paidLeaveRow).getByText('10')).toBeInTheDocument();
    expect(within(paidLeaveRow).getByText('25')).toBeInTheDocument();
  });

  it('should display usedDays / totalDays for RTT', () => {
    render(<LeaveBalanceSummary balances={defaultBalances} />);
    const rows = screen.getAllByRole('row');
    // row[0] is header, row[1] is PAID_LEAVE, row[2] is RTT
    const rttRow = rows[2];
    expect(within(rttRow).getByText('4')).toBeInTheDocument();
    expect(within(rttRow).getByText('12')).toBeInTheDocument();
  });

  it('should compute remaining days correctly', () => {
    render(<LeaveBalanceSummary balances={defaultBalances} />);
    // PAID_LEAVE: 25 - 10 = 15 remaining
    const paidLeaveRemaining = screen.getByTestId('remaining-PAID_LEAVE');
    expect(paidLeaveRemaining).toHaveTextContent('15');
    // RTT: 12 - 4 = 8 remaining
    const rttRemaining = screen.getByTestId('remaining-RTT');
    expect(rttRemaining).toHaveTextContent('8');
  });

  it('should apply red text class when remaining < 2 days', () => {
    const lowBalances = [
      { leaveType: 'PAID_LEAVE', totalDays: 25, usedDays: 24 }, // 1 remaining
    ];
    render(<LeaveBalanceSummary balances={lowBalances} />);
    const remainingCell = screen.getByTestId('remaining-PAID_LEAVE');
    expect(remainingCell).toHaveClass('text-red-600');
  });

  it('should apply normal text class when remaining >= 2 days', () => {
    const goodBalances = [
      { leaveType: 'PAID_LEAVE', totalDays: 25, usedDays: 20 }, // 5 remaining
    ];
    render(<LeaveBalanceSummary balances={goodBalances} />);
    const remainingCell = screen.getByTestId('remaining-PAID_LEAVE');
    expect(remainingCell).not.toHaveClass('text-red-600');
  });

  it('should handle zero totalDays without dividing by zero', () => {
    const zeroBalances = [
      { leaveType: 'RTT', totalDays: 0, usedDays: 0 },
    ];
    expect(() => render(<LeaveBalanceSummary balances={zeroBalances} />)).not.toThrow();
    const remainingCell = screen.getByTestId('remaining-RTT');
    expect(remainingCell).toHaveTextContent('0');
  });

  it('should show N/A when balance not available for the year', () => {
    render(<LeaveBalanceSummary balances={[]} />);
    // When no balances provided, show N/A for both CP and RTT
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThan(0);
  });
});
