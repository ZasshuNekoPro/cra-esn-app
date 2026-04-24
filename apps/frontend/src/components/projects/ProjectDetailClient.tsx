'use client';

import { useState } from 'react';
import { ProjectStatus, Role } from '@esn/shared-types';
import type { ProjectDetail, WeatherEntry, ProjectComment } from '@esn/shared-types';
import { WeatherIcon } from './WeatherIcon';
import { WeatherCalendar } from './WeatherCalendar';
import { WeatherEntryForm } from './WeatherEntryForm';
import { ProjectComments } from './ProjectComments';
import { MilestoneTimeline } from './MilestoneTimeline';
import { ValidationRequestPanel } from './ValidationRequestPanel';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { loadWeatherHistoryAction } from '../../app/(dashboard)/projects/actions';
import { MONTH_NAMES, formatYearMonth } from '../../lib/utils/date';

interface ProjectDetailClientProps {
  project: ProjectDetail;
  initialComments: ProjectComment[];
  userRole: Role;
  currentYear: number;
  currentMonth: number;
}

export function ProjectDetailClient({
  project,
  initialComments,
  userRole,
  currentYear,
  currentMonth,
}: ProjectDetailClientProps): JSX.Element {
  const [weatherEntries, setWeatherEntries] = useState<WeatherEntry[]>(project.weatherHistory);
  const [showWeatherForm, setShowWeatherForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const isEmployee = userRole === Role.EMPLOYEE;
  const isActive = project.status === ProjectStatus.ACTIVE;

  const navigateMonth = async (direction: -1 | 1): Promise<void> => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }

    setLoadingWeather(true);
    setShowWeatherForm(false);
    setSelectedDate(undefined);
    try {
      const entries = await loadWeatherHistoryAction(project.id, formatYearMonth(newYear, newMonth));
      setWeatherEntries(entries);
    } catch {
      // silently keep previous entries on error
    } finally {
      setSelectedYear(newYear);
      setSelectedMonth(newMonth);
      setLoadingWeather(false);
    }
  };

  const handleWeatherSuccess = (entry: WeatherEntry): void => {
    setWeatherEntries((prev) =>
      [entry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    );
    setShowWeatherForm(false);
    setSelectedDate(undefined);
  };

  const handleDayClick = (date: string): void => {
    setSelectedDate(date);
    setShowWeatherForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <ProjectStatusBadge status={project.status} size="md" />
            <span className="text-sm text-gray-500">
              Depuis le {new Date(project.startDate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        {weatherEntries.length > 0 && (
          <WeatherIcon state={weatherEntries[0].state} size="lg" showLabel />
        )}
      </div>

      {/* Pending validations alert */}
      {project.pendingValidations.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-800">
            {project.pendingValidations.length} demande
            {project.pendingValidations.length > 1 ? 's' : ''} de validation en attente
          </p>
        </div>
      )}

      {/* Weather section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">Météo projet</h2>
          {isEmployee && isActive && !showWeatherForm && (
            <button
              type="button"
              onClick={() => setShowWeatherForm(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Saisir météo
            </button>
          )}
        </div>

        {/* Month / year navigation */}
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => void navigateMonth(-1)}
            disabled={loadingWeather}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 text-gray-600"
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700 w-36 text-center">
            {loadingWeather ? '...' : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
          </span>
          <button
            type="button"
            onClick={() => void navigateMonth(1)}
            disabled={loadingWeather}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 text-gray-600"
            aria-label="Mois suivant"
          >
            ›
          </button>
        </div>

        {showWeatherForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <WeatherEntryForm
              projectId={project.id}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              defaultDate={selectedDate}
              onSuccess={handleWeatherSuccess}
              onCancel={() => {
                setShowWeatherForm(false);
                setSelectedDate(undefined);
              }}
            />
          </div>
        )}

        <WeatherCalendar
          year={selectedYear}
          month={selectedMonth}
          entries={weatherEntries}
          isReadOnly={!isEmployee || !isActive}
          onDayClick={handleDayClick}
        />
      </section>

      {/* Milestones section */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Jalons</h2>
        <MilestoneTimeline
          projectId={project.id}
          initialMilestones={project.milestones}
          userRole={userRole}
        />
      </section>

      {/* Validation requests section */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Validations</h2>
        <ValidationRequestPanel
          projectId={project.id}
          initialValidations={project.pendingValidations}
          userRole={userRole}
        />
      </section>

      {/* Comments section */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Commentaires</h2>
        <ProjectComments
          projectId={project.id}
          initialComments={initialComments}
          canResolveBlockers={isEmployee}
        />
      </section>
    </div>
  );
}
