import { auth } from '../../auth';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardSidebar } from '../../components/shared/DashboardSidebar';
import { Role } from '@esn/shared-types';

export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== Role.CLIENT) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
