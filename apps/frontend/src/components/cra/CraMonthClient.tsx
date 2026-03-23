'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CraStatus, Role } from '@esn/shared-types';
import type { CraEntry, CraMonth } from '@esn/shared-types';
import type { CreateCraEntryRequest } from '@esn/shared-types';
import { MonthGrid } from './MonthGrid';
import { EntryModal } from './EntryModal';
import { SignatureActions } from './SignatureActions';
import { CraStatusBadge } from './CraStatusBadge';
import { EntryTypeLegend } from './EntryTypeLegend';
import { clientCraApi } from '../../lib/api/clientCra';

interface CraMonthClientProps {
  craMonth: CraMonth;
  initialEntries: CraEntry[];
  publicHolidayDates: string[];
  userRole: Role;
}

export function CraMonthClient({
  craMonth,
  initialEntries,
  publicHolidayDates,
  userRole,
}: CraMonthClientProps): JSX.Element {
  const router = useRouter();
  const [entries, setEntries] = useState<CraEntry[]>(initialEntries);
  const [status, setStatus] = useState<CraStatus>(craMonth.status);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isReadOnly = status !== CraStatus.DRAFT;

  // Find an existing entry for the selected date
  const selectedEntry = selectedDate
    ? entries.find((e) => {
        const d = e.date instanceof Date ? e.date : new Date(e.date);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
    : undefined;

  const handleDayClick = (date: Date): void => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleSave = async (data: CreateCraEntryRequest): Promise<void> => {
    if (selectedEntry) {
      // Update existing entry
      const updated = await clientCraApi.updateEntry(craMonth.id, selectedEntry.id, {
        entryType: data.entryType,
        dayFraction: data.dayFraction,
        comment: data.comment,
        projectEntries: data.projectEntries,
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e)),
      );
    } else {
      // Create new entry
      const created = await clientCraApi.createEntry(craMonth.id, data);
      setEntries((prev) => [...prev, created]);
    }
    router.refresh();
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedEntry) return;
    await clientCraApi.deleteEntry(craMonth.id, selectedEntry.id);
    setEntries((prev) => prev.filter((e) => e.id !== selectedEntry.id));
    router.refresh();
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const handleStatusChange = (newStatus: CraStatus): void => {
    setStatus(newStatus);
    router.refresh();
  };

  const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          {MONTH_NAMES[craMonth.month - 1]} {craMonth.year}
        </h1>
        <CraStatusBadge status={status} />
      </div>

      {/* Signature actions */}
      <SignatureActions
        craMonthId={craMonth.id}
        status={status}
        userRole={userRole}
        onStatusChange={handleStatusChange}
      />

      {/* Calendar grid */}
      <MonthGrid
        year={craMonth.year}
        month={craMonth.month}
        entries={entries}
        publicHolidayDates={publicHolidayDates}
        isReadOnly={isReadOnly}
        onDayClick={handleDayClick}
      />

      {/* Color legend */}
      <EntryTypeLegend />

      {/* Entry modal */}
      <EntryModal
        date={selectedDate}
        existingEntry={selectedEntry}
        onSave={handleSave}
        onDelete={selectedEntry ? handleDelete : undefined}
        onClose={handleCloseModal}
        isOpen={isModalOpen}
      />
    </div>
  );
}
