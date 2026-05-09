'use client';

import { clientApiClient } from './clientFetch';

export interface ContextNote {
  id: string;
  content: string;
  missionId: string;
  employeeId: string;
  createdAt: string;
}

export interface ContextNoteListResponse {
  data: ContextNote[];
  total: number;
  page: number;
  pageSize: number;
}

export const contextNotesClientApi = {
  list: (missionId: string, page = 1, pageSize = 20): Promise<ContextNoteListResponse> => {
    const qs = new URLSearchParams({
      missionId,
      page: String(page),
      pageSize: String(pageSize),
    });
    return clientApiClient.get<ContextNoteListResponse>(`/context-notes?${qs.toString()}`);
  },

  delete: (id: string): Promise<void> =>
    clientApiClient.delete<void>(`/context-notes/${id}`),
};
