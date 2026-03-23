'use client';

import { useState } from 'react';
import { CraStatus, Role } from '@esn/shared-types';
import { clientCraApi } from '../../lib/api/clientCra';

interface SignatureActionsProps {
  craMonthId: string;
  status: CraStatus;
  userRole: Role;
  onStatusChange: (newStatus: CraStatus) => void;
}

export function SignatureActions({
  craMonthId,
  status,
  userRole,
  onStatusChange,
}: SignatureActionsProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectAction, setRejectAction] = useState<'esn' | 'client' | null>(null);

  const runAction = (action: () => Promise<{ status: CraStatus }>): void => {
    setIsLoading(true);
    action()
      .then((updated) => {
        onStatusChange(updated.status);
      })
      .catch(() => {
        // Action failed — silently reset loading state
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleRejectSubmit = (): void => {
    if (!rejectComment.trim()) return;
    setIsLoading(true);
    const doReject = rejectAction === 'esn'
      ? clientCraApi.rejectEsn(craMonthId, rejectComment.trim())
      : clientCraApi.rejectClient(craMonthId, rejectComment.trim());

    doReject
      .then((updated) => {
        onStatusChange(updated.status);
        setShowRejectForm(false);
        setRejectComment('');
        setRejectAction(null);
      })
      .catch(() => {
        // Rejection failed — silently reset loading state
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const openReject = (action: 'esn' | 'client'): void => {
    setRejectAction(action);
    setShowRejectForm(true);
    setRejectComment('');
  };

  const cancelReject = (): void => {
    setShowRejectForm(false);
    setRejectComment('');
    setRejectAction(null);
  };

  if (status === CraStatus.LOCKED) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
        <span className="text-sm text-emerald-700 font-medium">CRA archiv&#233;</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* EMPLOYEE + DRAFT → Guidance vers l'envoi de rapport */}
      {userRole === Role.EMPLOYEE && status === CraStatus.DRAFT && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            Votre CRA est en cours de saisie.{' '}
            <a href="/reports" className="font-medium underline">
              Envoyez un rapport mensuel
            </a>{' '}
            pour le soumettre automatiquement.
          </p>
        </div>
      )}

      {/* EMPLOYEE + SUBMITTED → Signer ou Retirer */}
      {userRole === Role.EMPLOYEE && status === CraStatus.SUBMITTED && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runAction(() => clientCraApi.signEmployee(craMonthId))}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Traitement\u2026' : 'Signer'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runAction(() => clientCraApi.retract(craMonthId))}
            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Retirer la soumission
          </button>
        </div>
      )}

      {/* ESN_ADMIN + SIGNED_EMPLOYEE → Valider ou Refuser */}
      {userRole === Role.ESN_ADMIN && status === CraStatus.SIGNED_EMPLOYEE && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runAction(() => clientCraApi.signEsn(craMonthId))}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Traitement\u2026' : 'Valider'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => openReject('esn')}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Refuser
          </button>
        </div>
      )}

      {/* CLIENT + SIGNED_ESN → Valider ou Refuser */}
      {userRole === Role.CLIENT && status === CraStatus.SIGNED_ESN && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => runAction(() => clientCraApi.signClient(craMonthId))}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Traitement\u2026' : 'Valider'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => openReject('client')}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            Refuser
          </button>
        </div>
      )}

      {/* Inline rejection form */}
      {showRejectForm && (
        <div className="mt-3 p-4 border border-red-200 rounded-md bg-red-50 space-y-3">
          <label
            htmlFor="reject-comment"
            className="block text-sm font-medium text-red-700"
          >
            Motif du refus{' '}
            <span className="text-red-500 font-normal">(obligatoire)</span>
          </label>
          <textarea
            id="reject-comment"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            placeholder="D&#233;crivez le motif du refus (min. 10 caract&#232;res)&#8230;"
            className="w-full px-3 py-2 border border-red-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isLoading || rejectComment.trim().length < 10}
              onClick={handleRejectSubmit}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Envoi\u2026' : 'Confirmer le refus'}
            </button>
            <button
              type="button"
              onClick={cancelReject}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
