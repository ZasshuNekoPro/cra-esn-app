'use server';

import { usersApi } from '../../../../../lib/api/users';
import { Role } from '@esn/shared-types';
import type { PublicUser } from '../../../../../lib/api/users';

interface CreateEmployeeInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function listEmployeesAction(): Promise<PublicUser[]> {
  const users = await usersApi.list();
  return users.filter((u) => u.role === Role.EMPLOYEE);
}

export async function createEmployeeAction(
  data: CreateEmployeeInput,
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const user = await usersApi.create({ ...data, role: Role.EMPLOYEE });
    return { user };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création' };
  }
}

export async function updateEmployeeAction(
  id: string,
  data: UpdateEmployeeInput,
): Promise<{ user?: PublicUser; error?: string }> {
  try {
    const user = await usersApi.update(id, data);
    return { user };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' };
  }
}
