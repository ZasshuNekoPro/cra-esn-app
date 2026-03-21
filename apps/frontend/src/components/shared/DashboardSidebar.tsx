'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from './actions';
import { Role } from '@esn/shared-types';

interface SidebarUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

interface NavItem {
  href: string;
  label: string;
}

const EMPLOYEE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/cra', label: 'Mes CRA' },
  { href: '/projects', label: 'Mes projets' },
  { href: '/documents', label: 'Documents' },
  { href: '/assistant', label: 'Assistant IA' },
  { href: '/reports', label: 'Rapports' },
  { href: '/settings', label: 'Paramètres' },
];

const ESN_NAV: NavItem[] = [
  { href: '/esn/dashboard', label: 'Tableau de bord' },
  { href: '/esn/employees', label: 'Salariés' },
  { href: '/esn/missions', label: 'Missions' },
];

interface Props {
  user: SidebarUser;
}

export function DashboardSidebar({ user }: Props): JSX.Element {
  const pathname = usePathname();
  const navItems = user.role === Role.ESN_ADMIN ? ESN_NAV : EMPLOYEE_NAV;

  return (
    <aside className="w-64 bg-white shadow-sm flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <p className="text-lg font-bold text-blue-600">ESN CRA</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate mb-3">{user.email}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full text-left text-sm text-gray-500 hover:text-gray-700"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
