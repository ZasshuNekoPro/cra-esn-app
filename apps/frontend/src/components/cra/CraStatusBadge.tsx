'use client';

import { CraStatus } from '@esn/shared-types';

interface CraStatusBadgeProps {
  status: CraStatus;
}

const STATUS_CONFIG: Record<
  CraStatus,
  { label: string; className: string }
> = {
  [CraStatus.DRAFT]: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700',
  },
  [CraStatus.SUBMITTED]: {
    label: 'Soumis',
    className: 'bg-blue-100 text-blue-700',
  },
  [CraStatus.SIGNED_EMPLOYEE]: {
    label: 'Signé (salarié)',
    className: 'bg-indigo-100 text-indigo-700',
  },
  [CraStatus.SIGNED_ESN]: {
    label: 'Signé (ESN)',
    className: 'bg-purple-100 text-purple-700',
  },
  [CraStatus.SIGNED_CLIENT]: {
    label: 'Signé (client)',
    className: 'bg-green-100 text-green-700',
  },
  [CraStatus.LOCKED]: {
    label: 'Archivé',
    className: 'bg-emerald-100 text-emerald-700',
  },
};

export function CraStatusBadge({ status }: CraStatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
