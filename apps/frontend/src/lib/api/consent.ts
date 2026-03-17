import { apiClient } from './client';
import type { Consent } from '@esn/shared-types';

export interface ConsentWithUser extends Consent {
  requestedBy?: { id: string; firstName: string; lastName: string; email: string };
  employee?: { id: string; firstName: string; lastName: string; email: string };
}

export const consentApi = {
  // Employee: list consents on their data
  listMine: (): Promise<ConsentWithUser[]> =>
    apiClient.get('/consent/my'),

  // Employee: grant a pending consent
  grant: (id: string): Promise<Consent> =>
    apiClient.patch(`/consent/${id}/grant`),

  // Employee: revoke an active consent
  revoke: (id: string): Promise<Consent> =>
    apiClient.patch(`/consent/${id}/revoke`),

  // ESN_ADMIN: list consents they requested
  listSent: (): Promise<ConsentWithUser[]> =>
    apiClient.get('/consent/sent'),

  // ESN_ADMIN: request access to an employee's data
  request: (employeeId: string, scope: string[]): Promise<Consent> =>
    apiClient.post('/consent/request', { employeeId, scope }),
};
