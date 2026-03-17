'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeatherDataPoint } from '@esn/shared-types';
import { WeatherState } from '@esn/shared-types';

const WEATHER_LABELS: Record<WeatherState, string> = {
  [WeatherState.SUNNY]:             'Ensoleillé',
  [WeatherState.CLOUDY]:            'Nuageux',
  [WeatherState.RAINY]:             'Pluvieux',
  [WeatherState.STORM]:             'Orageux',
  [WeatherState.VALIDATION_PENDING]:'En attente',
  [WeatherState.VALIDATED]:         'Validé',
};

interface Props {
  data: WeatherDataPoint[];
}

function weatherTick(value: number): string {
  const map: Record<number, string> = { 1: '☀️', 2: '⛅', 3: '🌧️', 4: '⛈️' };
  return map[value] ?? '';
}

interface TooltipPayloadItem {
  payload: WeatherDataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow">
      <p className="font-medium text-gray-900">{point.date}</p>
      <p className="text-gray-600">{WEATHER_LABELS[point.state]}</p>
    </div>
  );
}

export function WeatherLineChart({ data }: Props): JSX.Element {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">Aucune donnée météo</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
        />
        <YAxis
          domain={[1, 4]}
          ticks={[1, 2, 3, 4]}
          tick={{ fontSize: 14 }}
          tickFormatter={weatherTick}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="numericValue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
