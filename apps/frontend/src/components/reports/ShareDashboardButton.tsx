'use client';

import { useState } from 'react';
import { ShareDashboardModal } from './ShareDashboardModal';

export function ShareDashboardButton(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Partager
      </button>
      {open && <ShareDashboardModal onClose={() => setOpen(false)} />}
    </>
  );
}
