'use client';

import { useState, useEffect } from 'react';
import { CraEntryType } from '@esn/shared-types';
import type { CraEntry } from '@esn/shared-types';
import type { CreateCraEntryRequest } from '@esn/shared-types';

interface EntryModalProps {
  date: Date | null;
  existingEntry?: CraEntry;
  onSave: (data: CreateCraEntryRequest) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

const ENTRY_TYPE_LABELS: Record<CraEntryType, string> = {
  [CraEntryType.WORK_ONSITE]: 'Travail présentiel',
  [CraEntryType.WORK_REMOTE]: 'Télétravail',
  [CraEntryType.WORK_TRAVEL]: 'Déplacement',
  [CraEntryType.LEAVE_CP]: 'Congé payé (CP)',
  [CraEntryType.LEAVE_RTT]: 'RTT',
  [CraEntryType.SICK]: 'Maladie',
  [CraEntryType.HOLIDAY]: 'Jour férié',
  [CraEntryType.TRAINING]: 'Formation',
  [CraEntryType.ASTREINTE]: 'Astreinte',
  [CraEntryType.OVERTIME]: 'Heures supplémentaires',
};

const ENTRY_TYPES = Object.values(CraEntryType);

function formatDateFR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function EntryModal({
  date,
  existingEntry,
  onSave,
  onDelete,
  onClose,
  isOpen,
}: EntryModalProps): JSX.Element | null {
  const [entryType, setEntryType] = useState<CraEntryType>(
    existingEntry?.entryType ?? CraEntryType.WORK_ONSITE,
  );
  const [dayFraction, setDayFraction] = useState<number>(
    existingEntry?.dayFraction ?? 1.0,
  );
  const [comment, setComment] = useState<string>(existingEntry?.comment ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync form state when existingEntry changes
  useEffect(() => {
    setEntryType(existingEntry?.entryType ?? CraEntryType.WORK_ONSITE);
    setDayFraction(existingEntry?.dayFraction ?? 1.0);
    setComment(existingEntry?.comment ?? '');
  }, [existingEntry, isOpen]);

  if (!isOpen || !date) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        date: toIsoDate(date),
        entryType,
        dayFraction,
        comment: comment.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {existingEntry ? "Modifier l\u2019entr\u00e9e" : 'Saisir une journ\u00e9e'}
        </h2>

        {/* Date (read-only) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="text"
            readOnly
            value={formatDateFR(date)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm"
          />
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Entry type */}
          <div>
            <label
              htmlFor="entry-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Type de journée
            </label>
            <select
              id="entry-type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as CraEntryType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ENTRY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Fraction */}
          <div>
            <label
              htmlFor="day-fraction"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fraction
            </label>
            <select
              id="day-fraction"
              value={String(dayFraction)}
              onChange={(e) => setDayFraction(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Journée complète</option>
              <option value="0.5">Demi-journée</option>
            </select>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Commentaire{' '}
              <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Commentaire libre…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {comment.length}/500
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            </div>

            {existingEntry && onDelete && (
              <button
                type="button"
                onClick={() => { void handleDelete(); }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
