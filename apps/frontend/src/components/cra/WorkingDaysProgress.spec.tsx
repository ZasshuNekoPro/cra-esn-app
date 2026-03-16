import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkingDaysProgress } from './WorkingDaysProgress';

describe('WorkingDaysProgress', () => {
  it('should display N filled days out of M working days', () => {
    render(
      <WorkingDaysProgress filledDays={15} workingDays={22} isOvertime={false} />,
    );
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument();
  });

  it('should render progress bar at correct percentage', () => {
    render(
      <WorkingDaysProgress filledDays={11} workingDays={22} isOvertime={false} />,
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should apply warning color when isOvertime=true', () => {
    render(
      <WorkingDaysProgress filledDays={23} workingDays={22} isOvertime={true} />,
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('should apply normal color when isOvertime=false', () => {
    render(
      <WorkingDaysProgress filledDays={10} workingDays={22} isOvertime={false} />,
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).not.toHaveClass('bg-red-500');
  });

  it('should show 100% when all working days are filled', () => {
    render(
      <WorkingDaysProgress filledDays={22} workingDays={22} isOvertime={false} />,
    );
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
});
