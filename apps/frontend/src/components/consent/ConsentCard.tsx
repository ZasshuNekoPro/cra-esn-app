'use client';

import { ConsentStatus } from '@esn/shared-types';
import type { ConsentWithUser } from '../../lib/api/consent';

const STATUS_CONFIG: Record<ConsentStatus, { label: string; class: string }> = {
  [ConsentStatus.PENDING]: { label: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
  [ConsentStatus.GRANTED]: { label: 'Accordé', class: 'bg-green-100 text-green-800' },
  [ConsentStatus.REVOKED]: { label: 'Révoqué', class: 'bg-red-100 text-red-800' },
};

interface ConsentCardProps {
  consent: ConsentWithUser;
  /** Shown in employee view: grant/revoke actions */
  onGrant?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

export function ConsentCard({ consent, onGrant, onRevoke }: ConsentCardProps) {
  const cfg = STATUS_CONFIG[consent.status];
  const requester = consent.requestedBy;
  const employee = consent.employee;
  const displayName = requester
    ? `${requester.firstName} ${requester.lastName}`
    : employee
      ? `${employee.firstName} ${employee.lastName}`
      : '—';

  return (
    <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{displayName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
            {cfg.label}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Périmètre : {consent.scope.join(', ')}
        </div>
        {consent.grantedAt && (
          <div className="mt-0.5 text-xs text-gray-400">
            Accordé le {new Date(consent.grantedAt).toLocaleDateString('fr-FR')}
          </div>
        )}
        {consent.revokedAt && (
          <div className="mt-0.5 text-xs text-gray-400">
            Révoqué le {new Date(consent.revokedAt).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onGrant && consent.status === ConsentStatus.PENDING && (
          <button
            onClick={() => onGrant(consent.id)}
            className="px-3 py-1.5 text-xs font-medium text-green-700 border border-green-300 rounded hover:bg-green-50 transition-colors"
          >
            Accorder
          </button>
        )}
        {onRevoke && consent.status === ConsentStatus.GRANTED && (
          <button
            onClick={() => onRevoke(consent.id)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            Révoquer
          </button>
        )}
      </div>
    </div>
  );
}
