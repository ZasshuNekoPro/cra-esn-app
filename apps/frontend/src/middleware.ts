import { auth } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@esn/shared-types';

const AUTH_PATHS = ['/login'];
const ANONYMOUS_PATHS = ['/validate-report'];
const ESN_PATHS = ['/esn'];
const PLATFORM_PATHS = ['/platform'];
const MANAGER_PATHS = ['/manager'];
const CLIENT_PATHS = ['/client'];

function roleDefaultPath(role: Role | undefined): string {
  if (role === Role.PLATFORM_ADMIN) return '/platform/admin/dashboard';
  if (role === Role.ESN_ADMIN) return '/esn/admin/dashboard';
  if (role === Role.ESN_MANAGER) return '/manager/dashboard';
  if (role === Role.CLIENT) return '/client/dashboard';
  return '/dashboard';
}

export default auth(function middleware(req: NextRequest & { auth: { user?: { role?: Role } } | null }) {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthenticated = !!session;

  // Fully public paths — accessible with or without auth (no redirect)
  if (ANONYMOUS_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Auth-only public paths (redirect authenticated users away)
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(roleDefaultPath(session?.user?.role), req.url));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session?.user?.role;

  // Platform admin routes — only PLATFORM_ADMIN
  if (PLATFORM_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.PLATFORM_ADMIN) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // ESN admin routes — only ESN_ADMIN
  if (ESN_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.ESN_ADMIN) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // ESN manager routes — only ESN_MANAGER
  if (MANAGER_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.ESN_MANAGER) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // Client routes — only CLIENT
  if (CLIENT_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.CLIENT) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
