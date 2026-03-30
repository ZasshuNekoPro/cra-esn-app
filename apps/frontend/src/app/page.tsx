import { auth } from '../auth';
import { redirect } from 'next/navigation';
import { Role } from '@esn/shared-types';

export default async function Home(): Promise<never> {
  const session = await auth();
  if (session?.user?.role === Role.PLATFORM_ADMIN) {
    redirect('/platform/admin/dashboard');
  }
  if (session?.user?.role === Role.ESN_ADMIN) {
    redirect('/esn/admin/dashboard');
  }
  redirect('/dashboard');
}
