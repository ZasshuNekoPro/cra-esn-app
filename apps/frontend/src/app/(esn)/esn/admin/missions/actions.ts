'use server';

import { usersApi } from '../../../../../lib/api/users';
import { missionsApi, type Mission } from '../../../../../lib/api/missions';
import { Role } from '@esn/shared-types';
import type { PublicUser } from '../../../../../lib/api/users';

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
