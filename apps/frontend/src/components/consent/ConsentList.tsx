'use client';

import { useState } from 'react';
import { ConsentCard } from './ConsentCard';
import { consentApi } from '../../lib/api/consent';
import type { ConsentWithUser } from '../../lib/api/consent';

interface ConsentListProps {
  initialConsents: ConsentWithUser[];
  /** If true, show grant/revoke actions (employee view) */
  editable?: boolean;
}

export function ConsentList({ initialConsents, editable = false }: ConsentListProps) {
  const [consents, setConsents] = useState(initialConsents);
  const [error, setError] = useState<string | null>(null);

  async function handleGrant(id: string) {
    try {
      const updated = await consentApi.grant(id);
      setConsents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Révoquer cet accès ?')) return;
    try {
      const updated = await consentApi.revoke(id);
      setConsents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (consents.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Aucune demande d'accès</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      {consents.map((consent) => (
        <ConsentCard
          key={consent.id}
          consent={consent}
          onGrant={editable ? (id) => void handleGrant(id) : undefined}
          onRevoke={editable ? (id) => void handleRevoke(id) : undefined}
        />
      ))}
    </div>
  );
}
