import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WeatherCalendar } from './WeatherCalendar';
import { WeatherState, type WeatherEntry } from '@esn/shared-types';

// Mock WeatherIcon to make assertions easier
vi.mock('./WeatherIcon', () => ({
  WeatherIcon: ({ state }: { state: string }) => (
    <span data-testid="weather-icon" data-state={state} />
  ),
}));

describe('WeatherCalendar', () => {
  const baseProps = {
    year: 2026,
    month: 4, // April 2026
    entries: [] as WeatherEntry[],
  };

  const mockEntry = (overrides: Partial<WeatherEntry> = {}): WeatherEntry => ({
    id: `entry-${Math.random()}`,
    projectId: 'project-1',
    state: WeatherState.SUNNY,
    date: new Date('2026-04-01'),
    comment: null,
    isEscalated: false,
    escalatedAt: null,
    reportedById: 'user-1',
    createdAt: new Date('2026-04-01'),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correct number of day cells for April 2026', () => {
    render(<WeatherCalendar {...baseProps} />);

    // April 2026 has 30 days
    const dayButtons = screen.getAllByRole('button');
    const daysWithNumbers = dayButtons.filter(button =>
      /^\d+$/.test(button.textContent?.trim() || '')
    );

    expect(daysWithNumbers).toHaveLength(30);

    // Check that days 1 through 30 are present
    for (let day = 1; day <= 30; day++) {
      expect(screen.getByRole('button', { name: new RegExp(`^${day}$`) })).toBeInTheDocument();
    }
  });

  it('renders week day headers', () => {
    render(<WeatherCalendar {...baseProps} />);

    const expectedHeaders = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
    expectedHeaders.forEach(header => {
      expect(screen.getByText(header)).toBeInTheDocument();
    });
  });

  it('disables weekend days', () => {
    render(<WeatherCalendar {...baseProps} onDayClick={vi.fn()} />);

    // April 2026: 1st is Wednesday, so weekends are 4(Sat),5(Sun), 11,12, 18,19, 25,26
    const weekendDays = [4, 5, 11, 12, 18, 19, 25, 26];

    weekendDays.forEach(day => {
      const dayButton = screen.getByRole('button', { name: new RegExp(`^${day}$`) });
      expect(dayButton).toBeDisabled();
    });
  });

  it('calls onDayClick with ISO date string on weekday click', () => {
    const mockOnDayClick = vi.fn();
    render(<WeatherCalendar {...baseProps} onDayClick={mockOnDayClick} />);

    // Click on Tuesday April 1st, 2026
    const dayButton = screen.getByRole('button', { name: '1' });
    fireEvent.click(dayButton);

    expect(mockOnDayClick).toHaveBeenCalledWith('2026-04-01');
  });

  it('does not call onDayClick when isReadOnly=true', () => {
    const mockOnDayClick = vi.fn();
    render(<WeatherCalendar {...baseProps} isReadOnly onDayClick={mockOnDayClick} />);

    // Try to click on a weekday
    const dayButton = screen.getByRole('button', { name: '1' });
    fireEvent.click(dayButton);

    expect(mockOnDayClick).not.toHaveBeenCalled();
  });

  it('handles first-wins deduplication for entries on the same date', () => {
    // Create two entries for the same date - newer entry should win (first in array)
    const newerEntry = mockEntry({
      id: 'entry-newer',
      date: new Date('2026-04-01'),
      state: WeatherState.SUNNY,
      createdAt: new Date('2026-04-01T10:00:00Z'),
    });

    const olderEntry = mockEntry({
      id: 'entry-older',
      date: new Date('2026-04-01'),
      state: WeatherState.STORM,
      createdAt: new Date('2026-04-01T09:00:00Z'),
    });

    // Array is sorted newest-first as per the business logic
    render(<WeatherCalendar {...baseProps} entries={[newerEntry, olderEntry]} />);

    // Should only have one weather icon for April 1st
    const weatherIcons = screen.getAllByTestId('weather-icon');
    const sunnyIcons = weatherIcons.filter(icon => icon.getAttribute('data-state') === WeatherState.SUNNY);
    const stormIcons = weatherIcons.filter(icon => icon.getAttribute('data-state') === WeatherState.STORM);

    expect(sunnyIcons).toHaveLength(1);
    expect(stormIcons).toHaveLength(0);
  });

  it('shows weather icon for entries with correct state', () => {
    const entry = mockEntry({
      date: new Date('2026-04-15'),
      state: WeatherState.CLOUDY,
    });

    render(<WeatherCalendar {...baseProps} entries={[entry]} />);

    const weatherIcon = screen.getByTestId('weather-icon');
    expect(weatherIcon).toHaveAttribute('data-state', WeatherState.CLOUDY);
  });

  it('applies escalated styling for escalated entries', () => {
    const escalatedEntry = mockEntry({
      date: new Date('2026-04-10'),
      state: WeatherState.RAINY,
      isEscalated: true,
      escalatedAt: new Date('2026-04-10T08:00:00Z'),
    });

    render(<WeatherCalendar {...baseProps} entries={[escalatedEntry]} />);

    const dayButton = screen.getByRole('button', { name: '10' });
    expect(dayButton).toHaveClass('border-orange-400', 'bg-orange-50');
  });

  it('shows entry comment as title tooltip', () => {
    const entryWithComment = mockEntry({
      date: new Date('2026-04-20'),
      state: WeatherState.STORM,
      comment: 'Urgent issue with deployment',
    });

    render(<WeatherCalendar {...baseProps} entries={[entryWithComment]} />);

    const dayButton = screen.getByRole('button', { name: '20' });
    expect(dayButton).toHaveAttribute('title', 'Urgent issue with deployment');
  });

  it('does not show title tooltip for entries without comment', () => {
    const entryWithoutComment = mockEntry({
      date: new Date('2026-04-20'),
      state: WeatherState.SUNNY,
      comment: null,
    });

    render(<WeatherCalendar {...baseProps} entries={[entryWithoutComment]} />);

    const dayButton = screen.getByRole('button', { name: '20' });
    expect(dayButton).not.toHaveAttribute('title');
  });

  it('renders empty cells for days outside the month', () => {
    const { container } = render(<WeatherCalendar {...baseProps} />);

    // April 2026 starts on Wednesday (offset=2) → 2 leading + 3 trailing = 5 empty cells
    // Total grid = 35 cells (5 rows × 7 cols): 5 empty divs + 30 day buttons
    const emptyDivs = container.querySelectorAll('div.aspect-square');
    expect(emptyDivs.length).toBe(5);

    const dayButtons = container.querySelectorAll('button[type="button"]');
    expect(dayButtons.length).toBe(30);
  });

  it('handles entries with Date objects vs string dates', () => {
    const entryWithDateObject = mockEntry({
      id: 'entry-date-obj',
      date: new Date('2026-04-05'),
      state: WeatherState.VALIDATED,
    });

    const entryWithDateString = mockEntry({
      id: 'entry-date-str',
      date: '2026-04-07' as any, // Type assertion to simulate string input
      state: WeatherState.VALIDATION_PENDING,
    });

    render(<WeatherCalendar {...baseProps} entries={[entryWithDateObject, entryWithDateString]} />);

    // Both should render weather icons
    const weatherIcons = screen.getAllByTestId('weather-icon');
    expect(weatherIcons).toHaveLength(2);

    const validatedIcon = weatherIcons.find(icon =>
      icon.getAttribute('data-state') === WeatherState.VALIDATED
    );
    const pendingIcon = weatherIcons.find(icon =>
      icon.getAttribute('data-state') === WeatherState.VALIDATION_PENDING
    );

    expect(validatedIcon).toBeInTheDocument();
    expect(pendingIcon).toBeInTheDocument();
  });

  it('applies correct hover styles for clickable weekdays', () => {
    const mockOnDayClick = vi.fn();
    render(<WeatherCalendar {...baseProps} onDayClick={mockOnDayClick} />);

    // Get a weekday button (April 1st is a Tuesday)
    const weekdayButton = screen.getByRole('button', { name: '1' });

    expect(weekdayButton).toHaveClass('hover:bg-blue-50', 'hover:border-blue-300', 'cursor-pointer');
    expect(weekdayButton).not.toBeDisabled();
  });

  it('does not apply hover styles for non-clickable days', () => {
    render(<WeatherCalendar {...baseProps} isReadOnly onDayClick={vi.fn()} />);

    const weekdayButton = screen.getByRole('button', { name: '1' });

    expect(weekdayButton).toHaveClass('cursor-default');
    expect(weekdayButton).not.toHaveClass('hover:bg-blue-50', 'hover:border-blue-300', 'cursor-pointer');
  });

  it('renders weekend styling correctly', () => {
    render(<WeatherCalendar {...baseProps} />);

    // April 5th, 2026 is a Saturday
    const saturdayButton = screen.getByRole('button', { name: '5' });

    expect(saturdayButton).toHaveClass('bg-gray-50', 'text-gray-300', 'border-gray-100');

    // Check the day number text has weekend styling
    const daySpan = saturdayButton.querySelector('span');
    expect(daySpan).toHaveClass('text-gray-300');
  });

  it('renders weekday styling correctly', () => {
    render(<WeatherCalendar {...baseProps} />);

    // April 1st, 2026 is a Tuesday
    const tuesdayButton = screen.getByRole('button', { name: '1' });

    expect(tuesdayButton).toHaveClass('border-gray-200');
    expect(tuesdayButton).not.toHaveClass('bg-gray-50', 'text-gray-300', 'border-gray-100');

    // Check the day number text has weekday styling
    const daySpan = tuesdayButton.querySelector('span');
    expect(daySpan).toHaveClass('text-gray-500');
  });
});