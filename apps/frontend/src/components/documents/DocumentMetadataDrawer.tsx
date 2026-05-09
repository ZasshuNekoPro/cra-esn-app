'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { documentMetadataClientApi } from '../../lib/api/documents';
import type { DocumentMetadata, UpsertMetadataRequest } from '../../lib/api/documents';

interface Props {
  documentId: string;
  documentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentMetadataDrawer({ documentId, documentName, isOpen, onClose }: Props): JSX.Element {
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<UpsertMetadataRequest>({
    version: '1.0',
    isObsolete: false,
    documentDate: null,
    serviceInvolved: null,
    tags: [],
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    documentMetadataClientApi.get(documentId)
      .then((data) => {
        setMetadata(data);
        setForm({
          version: data.version,
          isObsolete: data.isObsolete,
          documentDate: data.documentDate ?? null,
          serviceInvolved: data.serviceInvolved ?? null,
          tags: data.tags,
        });
      })
      .catch(() => {
        // No metadata yet — use defaults
        setMetadata(null);
        setForm({ version: '1.0', isObsolete: false, documentDate: null, serviceInvolved: null, tags: [] });
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, documentId]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const saved = await documentMetadataClientApi.upsert(documentId, form);
      setMetadata(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }

  function handleTagsChange(raw: string) {
    const tags = raw.split(',').map((t) => t.trim()).filter(Boolean);
    setForm((f) => ({ ...f, tags }));
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40 animate-in fade-in" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-base font-semibold text-gray-900">
                Métadonnées
              </Dialog.Title>
              <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{documentName}</p>
            </div>
            <Dialog.Close asChild>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={form.version ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 1.0, 2024-01"
                  />
                </div>

                {/* Document date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date du document
                  </label>
                  <input
                    type="date"
                    value={form.documentDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, documentDate: e.target.value || null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Service involved */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service concerné
                  </label>
                  <input
                    type="text"
                    value={form.serviceInvolved ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, serviceInvolved: e.target.value || null }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: RH, DSI, Direction…"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags <span className="text-gray-400 font-normal">(séparés par des virgules)</span>
                  </label>
                  <input
                    type="text"
                    value={form.tags?.join(', ') ?? ''}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: contrat, rgpd, sécurité"
                  />
                  {(form.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {form.tags?.map((tag) => (
                        <span key={tag} className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Obsolete toggle */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Document obsolète</p>
                    <p className="text-xs text-gray-400 mt-0.5">Les documents obsolètes sont exclus de l'assistant IA</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isObsolete: !f.isObsolete }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.isObsolete ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                    aria-pressed={form.isObsolete}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.isObsolete ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {form.isObsolete && !metadata?.isObsolete && (
                  <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    Marquer comme obsolète supprimera les embeddings IA pour ce document.
                  </p>
                )}

                {/* Last updated */}
                {metadata?.updatedAt && (
                  <p className="text-xs text-gray-400">
                    Dernière mise à jour : {new Date(metadata.updatedAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 space-y-2">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                Métadonnées sauvegardées
              </p>
            )}
            <button
              onClick={() => void handleSave()}
              disabled={isLoading || isSaving}
              className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
