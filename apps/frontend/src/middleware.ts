import { auth } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@esn/shared-types';

const AUTH_PATHS = ['/login'];
const ANONYMOUS_PATHS = ['/validate-report'];
const ESN_PATHS = ['/esn'];
const PLATFORM_PATHS = ['/platform'];
const CLIENT_PATHS = ['/client'];
const EMPLOYEE_PATHS = ['/dashboard', '/cra', '/reports', '/documents', '/projects', '/settings', '/assistant', '/consent'];
// Paths from deleted route groups — redirect to role default instead of 404
const DEPRECATED_PATHS = ['/manager'];

const VALID_ROLES = new Set<string>(Object.values(Role));

// NextAuth v5 session cookie names (dev + prod variants)
const SESSION_COOKIE_NAMES = ['next-auth.session-token', '__Secure-next-auth.session-token'];

function roleDefaultPath(role: Role | undefined): string {
  if (role === Role.PLATFORM_ADMIN) return '/platform/admin/dashboard';
  if (role === Role.ESN_ADMIN) return '/esn/admin/dashboard';
  if (role === Role.CLIENT) return '/client/dashboard';
  return '/dashboard';
}

function clearSessionCookies(response: NextResponse): NextResponse {
  SESSION_COOKIE_NAMES.forEach((name) => response.cookies.delete(name));
  return response;
}

export default auth(function middleware(req: NextRequest & { auth: { user?: { role?: Role } } | null }) {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthenticated = !!session;
  const role = session?.user?.role;
  // A role value not in the current enum means a stale JWT (e.g. ESN_MANAGER after role migration)
  const hasValidRole = role === undefined || VALID_ROLES.has(role as string);

  // Fully public paths — accessible with or without auth (no redirect)
  if (ANONYMOUS_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Auth-only public paths (redirect authenticated users away)
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (isAuthenticated) {
      if (!hasValidRole) {
        // Stale role: let user see the login form and clear the invalid cookie
        return clearSessionCookies(NextResponse.next());
      }
      return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
    }
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Stale/unknown role (e.g. ESN_MANAGER JWT from before role migration) — clear session and force re-login
  if (!hasValidRole) {
    return clearSessionCookies(NextResponse.redirect(new URL('/login', req.url)));
  }

  // Deprecated paths from removed route groups — redirect to the user's correct dashboard
  if (DEPRECATED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // Platform admin routes — only PLATFORM_ADMIN
  if (PLATFORM_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.PLATFORM_ADMIN) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // ESN admin routes — only ESN_ADMIN
  if (ESN_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.ESN_ADMIN) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // Client routes — only CLIENT
  if (CLIENT_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.CLIENT) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  // Employee routes — only EMPLOYEE
  if (EMPLOYEE_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.EMPLOYEE) {
    return NextResponse.redirect(new URL(roleDefaultPath(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
