import { apiFetch, apiClient } from './client';
import { getSession } from 'next-auth/react';
import type { Document, DocumentVersion, DocumentShare } from '@esn/shared-types';

export interface DocumentWithRelations extends Document {
  versions: DocumentVersion[];
  shares: DocumentShare[];
}

export interface UploadDocumentOptions {
  name: string;
  type: string;
  missionId: string;
  projectId?: string;
  file: File;
}

export const documentsApi = {
  list: (params?: { missionId?: string; type?: string }): Promise<DocumentWithRelations[]> => {
    const query = new URLSearchParams();
    if (params?.missionId) query.set('missionId', params.missionId);
    if (params?.type) query.set('type', params.type);
    const qs = query.toString();
    return apiClient.get(`/documents${qs ? `?${qs}` : ''}`);
  },

  get: (id: string): Promise<DocumentWithRelations> =>
    apiClient.get(`/documents/${id}`),

  getVersions: (id: string): Promise<DocumentVersion[]> =>
    apiClient.get(`/documents/${id}/versions`),

  getDownloadUrl: (id: string): Promise<{ url: string }> =>
    apiClient.get(`/documents/${id}/download`),

  upload: async (opts: UploadDocumentOptions): Promise<DocumentWithRelations> => {
    const session = await getSession();
    const token = (session as { accessToken?: string } | null)?.accessToken ?? null;

    const form = new FormData();
    form.append('name', opts.name);
    form.append('type', opts.type);
    form.append('missionId', opts.missionId);
    if (opts.projectId) form.append('projectId', opts.projectId);
    form.append('file', opts.file);

    const res = await fetch(`/api/proxy/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    if (!res.ok) {
      const err = (await res.json()) as { message: string | string[] };
      const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
      throw new Error(msg);
    }

    return res.json() as Promise<DocumentWithRelations>;
  },

  share: (id: string, targetUserId: string): Promise<DocumentShare> =>
    apiClient.post(`/documents/${id}/share`, { targetUserId }),

  revokeShare: (id: string, shareId: string): Promise<DocumentShare> =>
    apiClient.delete(`/documents/${id}/share/${shareId}`),

  delete: (id: string): Promise<void> =>
    apiFetch(`/documents/${id}`, { method: 'DELETE' }),

  listSharedWithMe: (): Promise<DocumentWithRelations[]> =>
    apiClient.get('/documents/shared-with-me'),
};
