'use client';

import { useState } from 'react';
import { WeatherState } from '@esn/shared-types';
import type { WeatherEntry } from '@esn/shared-types';
import { WeatherIcon } from './WeatherIcon';
import { createWeatherEntryAction } from '../../app/(dashboard)/projects/actions';
import { pad } from '../../lib/utils/date';

const COMMENT_REQUIRED_STATES: WeatherState[] = [WeatherState.RAINY, WeatherState.STORM];

const WEATHER_STATE_LABELS: Record<WeatherState, string> = {
  [WeatherState.SUNNY]: 'Ensoleillé',
  [WeatherState.CLOUDY]: 'Nuageux',
  [WeatherState.RAINY]: 'Pluvieux',
  [WeatherState.STORM]: 'Orageux',
  [WeatherState.VALIDATION_PENDING]: 'Validation en attente',
  [WeatherState.VALIDATED]: 'Validé',
};

interface WeatherEntryFormProps {
  projectId: string;
  selectedYear: number;
  selectedMonth: number;
  defaultDate?: string; // ISO date — overrides computed default when a calendar day is clicked
  onSuccess: (entry: WeatherEntry) => void;
  onCancel: () => void;
}

export function WeatherEntryForm({
  projectId,
  selectedYear,
  selectedMonth,
  defaultDate,
  onSuccess,
  onCancel,
}: WeatherEntryFormProps): JSX.Element {
  const monthStart = `${selectedYear}-${pad(selectedMonth)}-01`;
  const monthEnd = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() + 1 === selectedMonth;
  const smartDefault = defaultDate ?? (isCurrentMonth ? today : monthStart);

  const [weatherState, setWeatherState] = useState<WeatherState>(WeatherState.SUNNY);
  const [date, setDate] = useState(smartDefault);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const needsComment = COMMENT_REQUIRED_STATES.includes(weatherState);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (needsComment && !comment.trim()) {
      setError('Un commentaire est obligatoire pour cet état météo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const entry = await createWeatherEntryAction(projectId, {
        state: weatherState,
        date,
        comment: comment.trim() || undefined,
      });
      onSuccess(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={date}
          min={monthStart}
          max={monthEnd}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">État météo</label>
        <div className="grid grid-cols-3 gap-2">
          {[WeatherState.SUNNY, WeatherState.CLOUDY, WeatherState.RAINY, WeatherState.STORM].map((ws) => (
            <button
              key={ws}
              type="button"
              onClick={() => setWeatherState(ws)}
              className={[
                'flex flex-col items-center gap-1 p-3 rounded-md border text-xs font-medium transition-colors',
                weatherState === ws
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              <WeatherIcon state={ws} size="md" />
              <span>{WEATHER_STATE_LABELS[ws]}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commentaire{' '}
          {needsComment ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-gray-400">(optionnel)</span>
          )}
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={needsComment ? 'Expliquez la situation...' : 'Commentaire facultatif'}
          required={needsComment}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
