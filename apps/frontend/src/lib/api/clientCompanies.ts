import { apiClient } from './client';
import { ClientContactType } from '@esn/shared-types';

export interface ClientContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  clientContactType: ClientContactType | null;
  clientCompanyId: string | null;
  createdAt: string;
}

export interface ClientCompany {
  id: string;
  name: string;
  siren: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  esnId: string;
  createdAt: string;
  contacts: ClientContact[];
}

export interface CreateContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  contactType: ClientContactType;
  phone?: string;
}

export interface CreateClientCompanyPayload {
  name: string;
  siren?: string;
  address?: string;
  website?: string;
  notes?: string;
  contacts: CreateContactPayload[];
}

export interface UpdateClientCompanyPayload {
  name?: string;
  siren?: string;
  address?: string;
  website?: string;
  notes?: string;
}

export const clientCompaniesApi = {
  list: (): Promise<ClientCompany[]> =>
    apiClient.get<ClientCompany[]>('/client-companies'),

  findOne: (id: string): Promise<ClientCompany> =>
    apiClient.get<ClientCompany>(`/client-companies/${id}`),

  create: (data: CreateClientCompanyPayload): Promise<ClientCompany> =>
    apiClient.post<ClientCompany>('/client-companies', data),

  update: (id: string, data: UpdateClientCompanyPayload): Promise<ClientCompany> =>
    apiClient.patch<ClientCompany>(`/client-companies/${id}`, data),
};

export const CONTACT_TYPE_LABELS: Record<ClientContactType, string> = {
  [ClientContactType.RESPONSABLE]: 'Responsable / Directeur',
  [ClientContactType.RH]:          'Ressources Humaines',
  [ClientContactType.FINANCIER]:   'Financier / DAF',
  [ClientContactType.TECHNIQUE]:   'Technique / DSI',
  [ClientContactType.AUTRE]:       'Autre',
};
