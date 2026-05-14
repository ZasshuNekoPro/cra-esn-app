'use client';

import { useState } from 'react';
import { clientApiClient } from '../../../../../lib/api/clientFetch';

interface Props {
  id: string;
}

export function PdfDownloadButton({ id }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { url } = await clientApiClient.get<{ url: string }>(`/reports/validation/${id}/download`);
      window.open(url, '_blank', 'noreferrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-sm text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50"
    >
      {loading ? '…' : 'PDF'}
    </button>
  );
}
