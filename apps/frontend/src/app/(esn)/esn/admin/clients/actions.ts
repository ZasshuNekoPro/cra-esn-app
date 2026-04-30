'use server';

import { usersApi } from '../../../../../lib/api/users';
import { clientCompaniesApi } from '../../../../../lib/api/clientCompanies';
import { Role } from '@esn/shared-types';
import type { PublicUser } from '../../../../../lib/api/users';
import type { ClientCompany, ClientContact, CreateClientCompanyPayload, CreateContactPayload, UpdateClientCompanyPayload } from '../../../../../lib/api/clientCompanies';

interface CreatePersonClientInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function listPersonClientsAction(): Promise<PublicUser[]> {
  const users = await usersApi.list();
  return users.filter((u) => u.role === Role.CLIENT && !u.clientCompanyId);
}

export async function listClientCompaniesAction(): Promise<ClientCompany[]> {
  return clientCompaniesApi.list();
}

export async function createPersonClientAction(
  data: CreatePersonClientInput,
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const user = await usersApi.create({ ...data, role: Role.CLIENT });
    return { user };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création' };
  }
}

export async function updateClientAction(
  id: string,
  data: { firstName?: string; lastName?: string; phone?: string },
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const user = await usersApi.update(id, data);
    return { user };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' };
  }
}

export async function createClientCompanyAction(
  data: CreateClientCompanyPayload,
): Promise<{ company?: ClientCompany; error?: string }> {
  try {
    const company = await clientCompaniesApi.create(data);
    return { company };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création' };
  }
}

export async function updateClientCompanyAction(
  id: string,
  data: UpdateClientCompanyPayload,
): Promise<{ company?: ClientCompany; error?: string }> {
  try {
    const company = await clientCompaniesApi.update(id, data);
    return { company };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' };
  }
}

export async function addContactToCompanyAction(
  companyId: string,
  data: CreateContactPayload,
): Promise<{ contact?: ClientContact; error?: string }> {
  try {
    const contact = await clientCompaniesApi.addContact(companyId, data);
    return { contact };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création du contact' };
  }
}
