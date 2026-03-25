import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntryTypeLegend } from './EntryTypeLegend';

describe('EntryTypeLegend', () => {
  it('renders without crashing', () => {
    const { container } = render(<EntryTypeLegend />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows label for Présentiel (WORK_ONSITE)', () => {
    render(<EntryTypeLegend />);
    expect(screen.getByText(/présentiel/i)).toBeInTheDocument();
  });

  it('shows label for Télétravail (WORK_REMOTE)', () => {
    render(<EntryTypeLegend />);
    expect(screen.getByText(/télétravail/i)).toBeInTheDocument();
  });

  it('shows label for Congés payés (LEAVE_CP)', () => {
    render(<EntryTypeLegend />);
    expect(screen.getByText(/congés payés/i)).toBeInTheDocument();
  });

  it('shows label for RTT (LEAVE_RTT)', () => {
    render(<EntryTypeLegend />);
    expect(screen.getByText(/rtt/i)).toBeInTheDocument();
  });

  it('renders a colored swatch for each entry type shown', () => {
    const { container } = render(<EntryTypeLegend />);
    const swatches = container.querySelectorAll('[data-testid="legend-swatch"]');
    expect(swatches.length).toBeGreaterThanOrEqual(4);
  });
});
