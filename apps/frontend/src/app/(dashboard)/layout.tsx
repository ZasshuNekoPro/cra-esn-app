import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Role } from '@esn/shared-types';
import { DashboardSidebar } from '../../components/shared/DashboardSidebar';

function roleDefaultPath(role: Role | undefined): string {
  if (role === Role.PLATFORM_ADMIN) return '/platform/admin/dashboard';
  if (role === Role.ESN_ADMIN) return '/esn/admin/dashboard';
  if (role === Role.ESN_MANAGER) return '/manager/dashboard';
  if (role === Role.CLIENT) return '/client/dashboard';
  return '/login';
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== Role.EMPLOYEE) {
    redirect(roleDefaultPath(session.user.role));
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
