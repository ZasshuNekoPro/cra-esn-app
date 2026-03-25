import { auth } from './auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@esn/shared-types';

const AUTH_PATHS = ['/login'];
const ANONYMOUS_PATHS = ['/validate-report'];
const ESN_PATHS = ['/esn'];

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
      // Redirect logged-in users away from login page
      return NextResponse.redirect(new URL('/dashboard', req.url));
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

  // ESN admin routes — only ESN_ADMIN
  if (ESN_PATHS.some((p) => pathname.startsWith(p)) && role !== Role.ESN_ADMIN) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
