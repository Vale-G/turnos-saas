
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import createIntlMiddleware from 'next-intl/middleware';
import { i18n } from '@/i18n';

// List of routes that are protected
const protectedRoutes = [
  '/dashboard',
  '/ajustes',
  '/caja',
  '/clientes',
  '/informes',
  '/servicios',
  '/staff',
  '/superadmin',
  '/turnos',
  '/upgrade',
];

// List of routes that are public
const publicRoutes = [
  '/login',
  '/registro-negocio',
  '/landing',
  '/privacidad',
  '/terminos',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is an API route, a static file or a next-specific route
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  // Get the user from the Supabase session
  const { data: { user } } = await createClient().auth.getUser();

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Handle protected routes
  if (isProtectedRoute) {
    if (!user) {
      // If the user is not authenticated, redirect to the login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Handle public routes
  if (isPublicRoute) {
    if (user) {
      // If the user is authenticated, redirect to the dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Handle i18n using the next-intl middleware
  const handleI18nRouting = createIntlMiddleware({
    locales: i18n.locales,
    defaultLocale: i18n.defaultLocale,
  });

  return handleI18nRouting(request);
}

export const config = {
  // Matcher to exclude an unnecessary i18n handling on static files
  matcher: ['/((?!_next/static|.*\\..*).*) / '],
};
