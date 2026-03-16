import { WeatherState } from '@esn/shared-types';

const WEATHER_CONFIG: Record<WeatherState, { emoji: string; label: string; color: string }> = {
  [WeatherState.SUNNY]:             { emoji: '☀️',  label: 'Ensoleillé',           color: 'text-yellow-500' },
  [WeatherState.CLOUDY]:            { emoji: '⛅',  label: 'Nuageux',              color: 'text-gray-400' },
  [WeatherState.RAINY]:             { emoji: '🌧️',  label: 'Pluvieux',             color: 'text-blue-400' },
  [WeatherState.STORM]:             { emoji: '⛈️',  label: 'Orageux',              color: 'text-red-500' },
  [WeatherState.VALIDATION_PENDING]:{ emoji: '🔶',  label: 'Validation en attente', color: 'text-orange-500' },
  [WeatherState.VALIDATED]:         { emoji: '✅',  label: 'Validé',               color: 'text-green-500' },
};

interface WeatherIconProps {
  state: WeatherState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function WeatherIcon({ state, size = 'md', showLabel = false }: WeatherIconProps): JSX.Element {
  const config = WEATHER_CONFIG[state];

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <span className={SIZE_CLASSES[size]} role="img" aria-label={config.label}>
        {config.emoji}
      </span>
      {showLabel && (
        <span className="text-sm font-medium">{config.label}</span>
      )}
    </span>
  );
}
