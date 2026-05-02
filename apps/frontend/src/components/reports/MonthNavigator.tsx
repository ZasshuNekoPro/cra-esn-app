'use client';

import { useRouter } from 'next/navigation';

interface Props {
  year: number;
  month: number;
}

export function MonthNavigator({ year, month }: Props): JSX.Element {
  const router = useRouter();

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const navigate = (y: number, m: number): void => {
    router.push(`/reports?year=${y}&month=${m}`);
  };

  const goToPrev = (): void => {
    if (month === 1) {
      navigate(year - 1, 12);
    } else {
      navigate(year, month - 1);
    }
  };

  const goToNext = (): void => {
    if (month === 12) {
      navigate(year + 1, 1);
    } else {
      navigate(year, month + 1);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={goToPrev}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Mois précédent"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={goToNext}
        disabled={isCurrentMonth}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Mois suivant"
      >
        ›
      </button>
    </div>
  );
}
