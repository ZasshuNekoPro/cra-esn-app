'use server';

import { missionsApi, type Mission, type UpdateMissionRequest } from '../../../../lib/api/missions';
import { usersApi, type PublicUser } from '../../../../lib/api/users';
import { Role } from '@esn/shared-types';
import type { CreateMissionRequest } from '@esn/shared-types';

export async function listMissionsAndUsersAction(): Promise<{
  missions: Mission[];
  employees: PublicUser[];
  clients: PublicUser[];
}> {
  const [missions, users] = await Promise.all([missionsApi.list(), usersApi.list()]);
  return {
    missions,
    employees: users.filter((u) => u.role === Role.EMPLOYEE),
    clients: users.filter((u) => u.role === Role.CLIENT),
  };
}

export async function createMissionAction(
  data: CreateMissionRequest,
): Promise<{ mission?: Mission; error?: string }> {
  try {
    const mission = await missionsApi.create(data);
    return { mission };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création' };
  }
}

export async function updateMissionAction(
  id: string,
  data: UpdateMissionRequest,
): Promise<{ mission?: Mission; error?: string }> {
  try {
    const mission = await missionsApi.update(id, data);
    return { mission };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour' };
  }
}

export async function deactivateMissionAction(
  id: string,
): Promise<{ error?: string }> {
  try {
    await missionsApi.deactivate(id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la désactivation' };
  }
}
