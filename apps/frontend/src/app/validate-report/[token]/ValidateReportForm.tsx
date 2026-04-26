'use client';

import { useState } from 'react';
import { reportValidationsApi } from '../../../lib/api/reportValidations';
import type { ValidateReportResponse } from '@esn/shared-types';

interface Props {
  token: string;
  onResult: (result: ValidateReportResponse) => void;
}

export function ValidateReportForm({ token, onResult }: Props): JSX.Element {
  const [validatorName, setValidatorName] = useState('');
  const [comment, setComment] = useState('');
  const [pendingAction, setPendingAction] = useState<'VALIDATE' | 'REFUSE' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = pendingAction !== null;

  const submit = async (action: 'VALIDATE' | 'REFUSE'): Promise<void> => {
    if (!validatorName.trim()) {
      setError('Veuillez saisir votre nom avant de valider.');
      return;
    }
    if (action === 'REFUSE' && !comment.trim()) {
      setError('Un motif est requis pour refuser un rapport.');
      return;
    }

    setError(null);
    setPendingAction(action);

    try {
      const res = await reportValidationsApi.submitValidation(token, {
        action,
        validatorName: validatorName.trim(),
        comment: comment.trim() || undefined,
      });
      onResult(res);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Une erreur est survenue.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="validator-name" className="block text-sm font-medium text-gray-700">
          Votre nom <span className="text-red-500">*</span>
        </label>
        <input
          id="validator-name"
          type="text"
          value={validatorName}
          onChange={(e) => { setValidatorName(e.target.value); }}
          placeholder="Ex : Marie Dupont"
          disabled={loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Commentaire{' '}
          <span className="text-gray-400 font-normal">(requis en cas de refus)</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => { setComment(e.target.value); }}
          placeholder="Motif du refus ou remarque..."
          rows={3}
          disabled={loading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => { void submit('VALIDATE'); }}
          disabled={loading}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-60"
        >
          {pendingAction === 'VALIDATE' ? 'Validation…' : 'Valider le rapport'}
        </button>
        <button
          type="button"
          onClick={() => { void submit('REFUSE'); }}
          disabled={loading}
          className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-60"
        >
          {pendingAction === 'REFUSE' ? 'Envoi…' : 'Refuser'}
        </button>
      </div>
    </div>
  );
}
