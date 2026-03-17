'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DaysByMonth } from '@esn/shared-types';

interface Props {
  data: DaysByMonth[];
}

export function DaysBarChart({ data }: Props): JSX.Element {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">Aucune donnée</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => {
            const [year, m] = v.split('-');
            return `${m ?? ''}/${(year ?? '').slice(2)}`;
          }}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value: number) => [`${value} j`, 'Jours']}
          labelFormatter={(label: string) => `Mois : ${label}`}
        />
        <Bar dataKey="days" fill="#60a5fa" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
