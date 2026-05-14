'use client';

import { useState, useEffect, useCallback } from 'react';
import { esnClientApi } from '../../../../../lib/api/esn';
import type { AuditLogItem, AuditLogListResponse } from '@esn/shared-types';

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'USER_LOGIN', label: 'Connexion' },
  { value: 'USER_LOGOUT', label: 'Déconnexion' },
  { value: 'CRA_SUBMITTED', label: 'CRA soumis' },
  { value: 'CRA_SIGNED', label: 'CRA signé' },
  { value: 'CRA_LOCKED', label: 'CRA verrouillé' },
  { value: 'REPORT_SENT', label: 'Rapport envoyé' },
  { value: 'REPORT_VALIDATED', label: 'Rapport validé' },
  { value: 'REPORT_REFUSED', label: 'Rapport refusé' },
  { value: 'DOCUMENT_SHARED', label: 'Document partagé' },
  { value: 'DOCUMENT_ACCESSED', label: 'Document accédé' },
  { value: 'CONSENT_ACCESS', label: 'Accès consentement' },
  { value: 'CONSENT_GRANTED', label: 'Consentement accordé' },
  { value: 'CONSENT_REVOKED', label: 'Consentement révoqué' },
  { value: 'PROJECT_CLOSED', label: 'Projet clôturé' },
  { value: 'WEATHER_UPDATED', label: 'Météo mise à jour' },
  { value: 'COMMENT_CREATED', label: 'Commentaire créé' },
  { value: 'VALIDATION_REQUESTED', label: 'Validation demandée' },
  { value: 'VALIDATION_APPROVED', label: 'Validation approuvée' },
  { value: 'VALIDATION_REJECTED', label: 'Validation rejetée' },
  { value: 'DASHBOARD_SHARE_CREATED', label: 'Partage tableau créé' },
  { value: 'DASHBOARD_SHARED_ACCESSED', label: 'Tableau partagé accédé' },
  { value: 'DASHBOARD_SHARE_REVOKED', label: 'Partage tableau révoqué' },
  { value: 'RAG_QUERY', label: 'Requête IA' },
  { value: 'RAG_REINDEX', label: 'Réindexation IA' },
];

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-green-100 text-green-800',
  USER_LOGOUT: 'bg-gray-100 text-gray-600',
  CRA_SUBMITTED: 'bg-blue-100 text-blue-800',
  CRA_SIGNED: 'bg-indigo-100 text-indigo-800',
  CRA_LOCKED: 'bg-purple-100 text-purple-800',
  REPORT_SENT: 'bg-cyan-100 text-cyan-800',
  REPORT_VALIDATED: 'bg-green-100 text-green-800',
  REPORT_REFUSED: 'bg-red-100 text-red-800',
  DOCUMENT_SHARED: 'bg-yellow-100 text-yellow-800',
  DOCUMENT_ACCESSED: 'bg-amber-100 text-amber-800',
  CONSENT_ACCESS: 'bg-orange-100 text-orange-800',
  CONSENT_GRANTED: 'bg-teal-100 text-teal-800',
  CONSENT_REVOKED: 'bg-red-100 text-red-800',
  PROJECT_CLOSED: 'bg-gray-100 text-gray-600',
  WEATHER_UPDATED: 'bg-sky-100 text-sky-800',
  COMMENT_CREATED: 'bg-violet-100 text-violet-800',
  VALIDATION_REQUESTED: 'bg-blue-100 text-blue-800',
  VALIDATION_APPROVED: 'bg-green-100 text-green-800',
  VALIDATION_REJECTED: 'bg-red-100 text-red-800',
  DASHBOARD_SHARE_CREATED: 'bg-pink-100 text-pink-800',
  DASHBOARD_SHARED_ACCESSED: 'bg-pink-50 text-pink-600',
  DASHBOARD_SHARE_REVOKED: 'bg-rose-100 text-rose-800',
  RAG_QUERY: 'bg-fuchsia-100 text-fuchsia-800',
  RAG_REINDEX: 'bg-fuchsia-100 text-fuchsia-800',
};

function actionLabel(action: string): string {
  return ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!metadata || Object.keys(metadata).length === 0) return <span className="text-gray-300">—</span>;

  const preview = Object.entries(metadata)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(', ');

  return (
    <div className="text-xs text-gray-500">
      {expanded ? (
        <>
          <pre className="whitespace-pre-wrap font-mono text-[10px] bg-gray-50 p-1 rounded max-w-xs overflow-auto">
            {JSON.stringify(metadata, null, 2)}
          </pre>
          <button onClick={() => setExpanded(false)} className="text-blue-500 hover:underline mt-0.5">
            Réduire
          </button>
        </>
      ) : (
        <>
          <span className="truncate block max-w-[200px]" title={preview}>{preview}</span>
          <button onClick={() => setExpanded(true)} className="text-blue-500 hover:underline">
            Voir plus
          </button>
        </>
      )}
    </div>
  );
}

export default function AuditLogsPage(): JSX.Element {
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    action: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await esnClientApi.getAuditLogs({
        action: filters.action || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        limit: 50,
      });
      setData(result);
    } catch {
      setError('Impossible de charger les logs.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const applyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const filteredItems: AuditLogItem[] = (data?.items ?? []).filter((item) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      item.initiatorName.toLowerCase().includes(q) ||
      item.initiatorEmail.toLowerCase().includes(q) ||
      item.resource.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs d&apos;activité</h1>
        {data && (
          <p className="text-sm text-gray-500">
            {data.total.toLocaleString('fr-FR')} entrée{data.total > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => applyFilters({ ...filters, action: e.target.value })}
              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recherche (nom / email / ressource)</label>
            <input
              type="text"
              placeholder="Filtrer..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => applyFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => applyFilters({ ...filters, dateTo: e.target.value })}
              className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {(filters.action || filters.search || filters.dateFrom || filters.dateTo) && (
          <button
            onClick={() => applyFilters({ action: '', search: '', dateFrom: '', dateTo: '' })}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm italic">Aucun log trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-44">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Initiateur</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ressource</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Métadonnées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${ACTION_COLORS[item.action] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {actionLabel(item.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-xs">{item.initiatorName}</div>
                      <div className="text-gray-400 text-[11px]">{item.initiatorEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{item.resource}</td>
                    <td className="px-4 py-3">
                      <MetadataCell metadata={item.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {data.page} / {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Précédent
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
