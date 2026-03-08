import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/lib/config/config-service';
import { createSafeCallbackUrl } from '@/lib/auth/validate-callback-url';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })
  const supabaseUrl = authConfig.supabase.url;
  const supabaseAnonKey = authConfig.supabase.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach((cookie) => supabaseResponse.cookies.set(cookie));
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Extract locale from URL (fr, en, etc.)
  const locale = request.nextUrl.pathname.split('/')[1] || 'en';
  
  // Extract path without locale
  const pathWithoutLocale = `/${request.nextUrl.pathname.split('/').slice(2).join('/')}`;
  
    // Public and private paths (without locale)
  const PUBLIC_PATHS = [
    '/auth/signin',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/admin/auth/signin',
    '/admin/auth/register',
    '/admin/auth/forgot-password',
    '/admin/auth/reset-password',
  ];
  const PRIVATE_PATHS: string[] = [
    '/client',  // All client routes require authentication
    '/admin',   // All admin routes require authentication
  ];

  const isPrivatePath = PRIVATE_PATHS.some(path => 
    pathWithoutLocale.startsWith(path) || 
    pathWithoutLocale === path
  );

  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );


  if (!user && isPrivatePath) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/signin`;
    url.searchParams.set('callbackUrl', createSafeCallbackUrl(request.nextUrl.pathname, request.nextUrl.search));
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse
}