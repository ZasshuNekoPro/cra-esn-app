'use server';

import { usersApi } from '../../../../lib/api/users';
import { Role } from '@esn/shared-types';
import type { PublicUser } from '../../../../lib/api/users';

interface CreateClientInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

export async function listClientsAction(): Promise<PublicUser[]> {
  const users = await usersApi.list();
  return users.filter((u) => u.role === Role.CLIENT);
}

export async function createClientAction(
  data: CreateClientInput,
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const user = await usersApi.create({ ...data, role: Role.CLIENT });
    return { user };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création' };
  }
}
