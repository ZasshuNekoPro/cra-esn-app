import { auth } from '../auth';
import { redirect } from 'next/navigation';
import { Role } from '@esn/shared-types';

export default async function Home(): Promise<never> {
  const session = await auth();
  const role = session?.user?.role;
  if (role === Role.PLATFORM_ADMIN) redirect('/platform/admin/dashboard');
  if (role === Role.ESN_ADMIN) redirect('/esn/admin/dashboard');
  if (role === Role.ESN_MANAGER) redirect('/manager/dashboard');
  if (role === Role.CLIENT) redirect('/client/dashboard');
  if (role === Role.EMPLOYEE) redirect('/dashboard');
  redirect('/login');
}
