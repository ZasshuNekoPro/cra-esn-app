'use client';

import { useState } from 'react';
import { SendReportModal } from './SendReportModal';

interface Props {
  year: number;
  month: number;
}

export function SendReportButton({ year, month }: Props): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Envoyer le rapport
      </button>
      {open && (
        <SendReportModal year={year} month={month} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
