'use client';

import { useState, useEffect } from 'react';
import { CraEntryType, CraEntryModifier } from '@esn/shared-types';
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

const PRIMARY_ENTRY_TYPES: CraEntryType[] = [
  CraEntryType.WORK_ONSITE,
  CraEntryType.WORK_REMOTE,
  CraEntryType.LEAVE_CP,
  CraEntryType.LEAVE_RTT,
  CraEntryType.SICK,
];

const PRIMARY_TYPE_LABELS: Record<CraEntryType, string> = {
  [CraEntryType.WORK_ONSITE]: 'Travail présentiel',
  [CraEntryType.WORK_REMOTE]: 'Télétravail',
  [CraEntryType.LEAVE_CP]: 'Congé payé',
  [CraEntryType.LEAVE_RTT]: 'RTT',
  [CraEntryType.SICK]: 'Maladie',
  [CraEntryType.HOLIDAY]: 'Jour férié',
  [CraEntryType.WORK_TRAVEL]: 'Déplacement (ancien)',
  [CraEntryType.TRAINING]: 'Formation (ancien)',
  [CraEntryType.ASTREINTE]: 'Astreinte (ancien)',
  [CraEntryType.OVERTIME]: 'Heures supp. (ancien)',
};

const MODIFIER_CONFIG: Array<{ value: CraEntryModifier; label: string; icon: string }> = [
  { value: CraEntryModifier.TRAVEL,   label: 'Déplacement',         icon: '✈' },
  { value: CraEntryModifier.TRAINING, label: 'Formation',            icon: '📚' },
  { value: CraEntryModifier.ON_CALL,  label: 'Astreinte',            icon: '📞' },
  { value: CraEntryModifier.OVERTIME, label: 'Heure supplémentaire', icon: '⊕' },
];

const WORK_TYPES = new Set<CraEntryType>([CraEntryType.WORK_ONSITE, CraEntryType.WORK_REMOTE]);

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
  const [modifiers, setModifiers] = useState<CraEntryModifier[]>(
    existingEntry?.modifiers ?? [],
  );
  const [secondHalfType, setSecondHalfType] = useState<CraEntryType | null>(
    existingEntry?.secondHalfType ?? null,
  );
  const [comment, setComment] = useState<string>(existingEntry?.comment ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setEntryType(existingEntry?.entryType ?? CraEntryType.WORK_ONSITE);
    setDayFraction(existingEntry?.dayFraction ?? 1.0);
    setModifiers(existingEntry?.modifiers ?? []);
    setSecondHalfType(existingEntry?.secondHalfType ?? null);
    setComment(existingEntry?.comment ?? '');
  }, [existingEntry, isOpen]);

  if (!isOpen || !date) {
    return null;
  }

  const isWorkType = WORK_TYPES.has(entryType);

  const toggleModifier = (mod: CraEntryModifier): void => {
    setModifiers((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const handleFractionChange = (value: number): void => {
    setDayFraction(value);
    if (value === 1.0) {
      setSecondHalfType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        date: toIsoDate(date),
        entryType,
        dayFraction,
        modifiers: isWorkType && modifiers.length > 0 ? modifiers : undefined,
        secondHalfType: dayFraction === 0.5 ? secondHalfType : undefined,
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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 z-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {existingEntry ? "Modifier l’entrée" : 'Saisir une journée'}
        </h2>

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
          {/* Primary type */}
          <div>
            <label htmlFor="entry-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type de journée
            </label>
            <select
              id="entry-type"
              value={entryType}
              onChange={(e) => {
                const t = e.target.value as CraEntryType;
                setEntryType(t);
                if (!WORK_TYPES.has(t)) setModifiers([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIMARY_ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRIMARY_TYPE_LABELS[type]}
                </option>
              ))}
              {/* Show legacy type as read-only option if existing entry uses it */}
              {existingEntry &&
                !PRIMARY_ENTRY_TYPES.includes(existingEntry.entryType) && (
                  <option value={existingEntry.entryType} disabled>
                    {PRIMARY_TYPE_LABELS[existingEntry.entryType]}
                  </option>
                )}
            </select>
          </div>

          {/* Modifiers — only for work types */}
          {isWorkType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modificateurs{' '}
                <span className="text-gray-400 font-normal">(cumulables)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODIFIER_CONFIG.map(({ value, label, icon }) => {
                  const active = modifiers.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleModifier(value)}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors',
                        active
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700',
                      ].join(' ')}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fraction */}
          <div>
            <label htmlFor="day-fraction" className="block text-sm font-medium text-gray-700 mb-1">
              Fraction
            </label>
            <select
              id="day-fraction"
              value={String(dayFraction)}
              onChange={(e) => handleFractionChange(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Journée complète</option>
              <option value="0.5">Demi-journée</option>
            </select>
          </div>

          {/* Second half type — only for half days */}
          {dayFraction === 0.5 && (
            <div>
              <label htmlFor="second-half-type" className="block text-sm font-medium text-gray-700 mb-1">
                L&apos;autre demi-journée{' '}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <select
                id="second-half-type"
                value={secondHalfType ?? ''}
                onChange={(e) =>
                  setSecondHalfType(e.target.value ? (e.target.value as CraEntryType) : null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— non renseigné —</option>
                {PRIMARY_ENTRY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PRIMARY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
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
