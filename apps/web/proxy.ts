// -------------------------------------------------------
// Unified middleware that supports *either* Supabase Auth
// *or* NextAuth (or both) while keeping locale handling
// -------------------------------------------------------

import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

import { NextRequest, NextResponse } from 'next/server';

type CookieToSet = {
	name: string;
	value: string;
	options?: Record<string, unknown>;
};

import { getAuthConfig } from '@/lib/auth/config';
import { updateSession as supabaseUpdate } from '@/lib/auth/supabase/middleware';
import { getToken } from 'next-auth/jwt';
import { createSafeCallbackUrl } from '@/lib/auth/validate-callback-url';

const intl = createIntlMiddleware(routing);

const ADMIN_PREFIX = '/admin';
const ADMIN_SIGNIN = '/admin/auth/signin';

/* ────────────────────────────── Locale helper ───────────────────────────────────── */

function resolveLocalePrefix(pathname: string): {
	prefix: string;
	hasLocale: boolean;
	locale?: string;
	pathWithoutLocale: string;
} {
	const segments = pathname.split('/').filter(Boolean);
	const maybeLocale = segments[0];
	const hasLocale = routing.locales.includes(maybeLocale as any);
	const pathWithoutLocale = hasLocale ? `/${segments.slice(1).join('/')}` : pathname;
	return {
		prefix: hasLocale ? `/${maybeLocale}` : '',
		hasLocale,
		locale: hasLocale ? maybeLocale : undefined,
		pathWithoutLocale
	};
}

/* ────────────────────────────────── Client Auth Guards ────────────────────────────── */

async function nextAuthClientGuard(req: NextRequest, baseRes: NextResponse): Promise<NextResponse | null> {
	try {
		const token = await getToken({ req, secret: process.env.AUTH_SECRET });

		// DEBUG: Log to identify production authentication issues
		console.log('[Client Guard Debug]', {
			path: req.nextUrl.pathname,
			hasToken: !!token,
			tokenEmail: token?.email ? 'present' : 'missing',
			authSecretExists: !!process.env.AUTH_SECRET,
			cookieHeader: req.headers.get('cookie')?.substring(0, 100) || 'no cookies'
		});

		if (token) {
			// User is authenticated
			return null; // null means "allow access"
		}
	} catch (error) {
		console.error(
			'NextAuth client guard error',
			error instanceof Error ? { name: error.name, message: error.message } : undefined
		);
	}

	// Not authenticated - redirect to signin with callback
	const url = req.nextUrl.clone();
	const { prefix: rootLocalePrefix } = resolveLocalePrefix(req.nextUrl.pathname);
	url.pathname = `${rootLocalePrefix}/auth/signin`;
	url.searchParams.set('callbackUrl', createSafeCallbackUrl(req.nextUrl.pathname, req.nextUrl.search));
	const redirectRes = NextResponse.redirect(url);
	baseRes.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
	return redirectRes;
}

async function supabaseClientGuard(req: NextRequest, baseRes: NextResponse): Promise<NextResponse | null> {
	// Refresh Supabase session & get proper cookies
	const supRes = await supabaseUpdate(req);
	supRes.cookies.getAll().forEach((cookie) => {
		baseRes.cookies.set(cookie);
	});

	// Get user from Supabase
	const { createServerClient } = await import('@supabase/ssr');
	const {
		data: { user }
	} = await createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll() {
				return req.cookies.getAll();
			},
			setAll(cookiesToSet: CookieToSet[]) {
				cookiesToSet.forEach((cookie) => baseRes.cookies.set(cookie));
			}
		}
	}).auth.getUser();

	if (user) {
		// User is authenticated
		return null; // null means "allow access"
	}

	// Not authenticated - redirect to signin with callback
	const url = req.nextUrl.clone();
	const { prefix: rootLocalePrefix } = resolveLocalePrefix(req.nextUrl.pathname);
	url.pathname = `${rootLocalePrefix}/auth/signin`;
	url.searchParams.set('callbackUrl', createSafeCallbackUrl(req.nextUrl.pathname, req.nextUrl.search));
	const redirectRes = NextResponse.redirect(url);
	baseRes.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
	return redirectRes;
}

/* ────────────────────────────────── NextAuth guard ────────────────────────────────── */

async function nextAuthGuard(req: NextRequest, baseRes: NextResponse): Promise<NextResponse> {
	try {
		// Use JWT token check (Edge-compatible)
		const token = await getToken({ req, secret: process.env.AUTH_SECRET });
		if (token?.isAdmin === true) {
			if (process.env.NODE_ENV === 'development') {
				console.log('[Middleware] Admin access granted via token');
			}
			return baseRes;
		}
	} catch (error) {
		console.error(
			'NextAuth guard error',
			error instanceof Error ? { name: error.name, message: error.message } : undefined
		);
	}

	// Redirect non-admins or on error
	if (process.env.NODE_ENV === 'development') {
		console.log('[Middleware] Access denied - redirecting to admin signin');
	}

	const url = req.nextUrl.clone();
	const { prefix: rootLocalePrefix } = resolveLocalePrefix(req.nextUrl.pathname);
	url.pathname = `${rootLocalePrefix}${ADMIN_SIGNIN}`;
	url.searchParams.set('callbackUrl', createSafeCallbackUrl(req.nextUrl.pathname, req.nextUrl.search));
	const redirectRes = NextResponse.redirect(url);
	baseRes.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
	return redirectRes;
}

/* ────────────────────────────── Supabase guard helper ────────────────────────────── */
async function supabaseGuard(req: NextRequest, baseRes: NextResponse): Promise<NextResponse> {
	// Refresh Supabase session & get proper cookies
	const supRes = await supabaseUpdate(req);

	// Merge any Set-Cookie headers from Supabase response into the base response
	supRes.cookies.getAll().forEach((cookie) => {
		baseRes.cookies.set(cookie);
	});

	// Get user from Supabase
	const { createServerClient } = await import('@supabase/ssr');
	const {
		data: { user }
	} = await createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		cookies: {
			getAll() {
				return req.cookies.getAll();
			},
			setAll(cookiesToSet: CookieToSet[]) {
				cookiesToSet.forEach((cookie) => baseRes.cookies.set(cookie));
			}
		}
	}).auth.getUser();

	// Check admin flag in user metadata
	const isAdmin = user?.user_metadata?.isAdmin === true || user?.user_metadata?.role === 'admin';
	if (!isAdmin) {
		const url = req.nextUrl.clone();
		const { prefix: rootLocalePrefix } = resolveLocalePrefix(req.nextUrl.pathname);
		url.pathname = `${rootLocalePrefix}${ADMIN_SIGNIN}`;
		url.searchParams.set('callbackUrl', createSafeCallbackUrl(req.nextUrl.pathname, req.nextUrl.search));
		const redirectRes = NextResponse.redirect(url);
		baseRes.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
		return redirectRes;
	}

	return baseRes;
}

/* ──────────────────────────────────── Main middleware ─────────────────────────────────── */

export default async function proxy(req: NextRequest) {
	const cfg = getAuthConfig();
	const originalPathname = req.nextUrl.pathname;

	// Inject x-tenant-domain header for subdomain tenant routing
	const hostname = req.headers.get('host') || '';
	req.headers.set('x-tenant-domain', hostname);

	const intlResponse = await intl(req as any);

	const { prefix: localePrefix, pathWithoutLocale } = resolveLocalePrefix(originalPathname);

	// Protect /client/* routes - require authentication and redirect admins to /admin
	if (pathWithoutLocale === '/client' || pathWithoutLocale.startsWith('/client/')) {
		if (cfg.provider === 'next-auth') {
			// Check if user is authenticated
			const authRedirect = await nextAuthClientGuard(req, intlResponse);
			if (authRedirect) {
				return authRedirect; // Not authenticated, redirect to signin
			}
			// User is authenticated - check if admin (redirect to /admin)
			const token = await getToken({ req, secret: process.env.AUTH_SECRET });
			if (token?.isAdmin === true) {
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}/admin`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		} else if (cfg.provider === 'supabase') {
			// Check if user is authenticated
			const authRedirect = await supabaseClientGuard(req, intlResponse);
			if (authRedirect) {
				return authRedirect; // Not authenticated, redirect to signin
			}
			// For Supabase, check user metadata for admin flag
			const { createServerClient } = await import('@supabase/ssr');
			const {
				data: { user }
			} = await createServerClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
				{
					cookies: {
						getAll() {
							return req.cookies.getAll();
						},
						setAll(cookiesToSet: CookieToSet[]) {
							cookiesToSet.forEach((cookie) => intlResponse.cookies.set(cookie));
						}
					}
				}
			).auth.getUser();

			const isAdmin = user?.user_metadata?.isAdmin === true || user?.user_metadata?.role === 'admin';
			if (isAdmin) {
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}/admin`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		} else if (cfg.provider === 'both') {
			// Check NextAuth first for authentication
			const nextAuthRedirect = await nextAuthClientGuard(req, intlResponse);
			if (nextAuthRedirect) {
				// NextAuth says not authenticated - try Supabase
				const supabaseRedirect = await supabaseClientGuard(req, intlResponse);
				if (supabaseRedirect) {
					return supabaseRedirect; // Neither authenticated, redirect to signin
				}
				// User is authenticated via Supabase - check Supabase admin status
				const { createServerClient } = await import('@supabase/ssr');
				const {
					data: { user }
				} = await createServerClient(
					process.env.NEXT_PUBLIC_SUPABASE_URL!,
					process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
					{
						cookies: {
							getAll() {
								return req.cookies.getAll();
							},
							setAll(cookiesToSet: CookieToSet[]) {
								cookiesToSet.forEach((cookie) => intlResponse.cookies.set(cookie));
							}
						}
					}
				).auth.getUser();
				const isSupabaseAdmin = user?.user_metadata?.isAdmin === true || user?.user_metadata?.role === 'admin';
				if (isSupabaseAdmin) {
					const url = req.nextUrl.clone();
					url.pathname = `${localePrefix}/admin`;
					const redirectRes = NextResponse.redirect(url);
					intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
					return redirectRes;
				}
				return intlResponse;
			}
			// User is authenticated via NextAuth - check NextAuth admin status
			const token = await getToken({ req, secret: process.env.AUTH_SECRET });
			if (token?.isAdmin === true) {
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}/admin`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		}
		return intlResponse;
	}

	if (pathWithoutLocale.startsWith(ADMIN_PREFIX) && pathWithoutLocale !== ADMIN_SIGNIN) {
		if (cfg.provider === 'supabase') {
			return supabaseGuard(req, intlResponse);
		} else if (cfg.provider === 'next-auth') {
			return nextAuthGuard(req, intlResponse);
		} else if (cfg.provider === 'both') {
			// Check NextAuth first; if it redirects, fallback to Supabase guard
			const nextAuthRes = await nextAuthGuard(req, intlResponse);
			const isRedirect = nextAuthRes.redirected || (nextAuthRes.status >= 300 && nextAuthRes.status < 400);
			if (!isRedirect) {
				return nextAuthRes;
			}
			// NextAuth denied or failed — try Supabase
			return supabaseGuard(req, intlResponse);
		}
	}

	// Redirect authenticated users away from /auth/* pages (signin, register, etc.)
	if (pathWithoutLocale.startsWith('/auth/')) {
		if (cfg.provider === 'next-auth') {
			const token = await getToken({ req, secret: process.env.AUTH_SECRET });
			if (token) {
				const target = token.isAdmin ? '/admin' : '/client/dashboard';
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}${target}`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		} else if (cfg.provider === 'supabase') {
			// Refresh Supabase session & get proper cookies
			await supabaseUpdate(req);
			const { createServerClient } = await import('@supabase/ssr');
			const {
				data: { user }
			} = await createServerClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
				{
					cookies: {
						getAll() {
							return req.cookies.getAll();
						},
						setAll(_cookiesToSet: CookieToSet[]) {
							// Just mocking setAll as we don't need to write back to response here for the check
						}
					}
				}
			).auth.getUser();

			if (user) {
				const isAdmin = user.user_metadata?.isAdmin === true || user.user_metadata?.role === 'admin';
				const target = isAdmin ? '/admin' : '/client/dashboard';
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}${target}`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		} else if (cfg.provider === 'both') {
			// Check NextAuth first
			const token = await getToken({ req, secret: process.env.AUTH_SECRET });
			if (token) {
				const target = token.isAdmin ? '/admin' : '/client/dashboard';
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}${target}`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}

			// Then check Supabase
			await supabaseUpdate(req);
			const { createServerClient } = await import('@supabase/ssr');
			const {
				data: { user }
			} = await createServerClient(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
				{
					cookies: {
						getAll() {
							return req.cookies.getAll();
						},
						setAll(_cookiesToSet: CookieToSet[]) {
							// mock
						}
					}
				}
			).auth.getUser();

			if (user) {
				const isAdmin = user.user_metadata?.isAdmin === true || user.user_metadata?.role === 'admin';
				const target = isAdmin ? '/admin' : '/client/dashboard';
				const url = req.nextUrl.clone();
				url.pathname = `${localePrefix}${target}`;
				const redirectRes = NextResponse.redirect(url);
				intlResponse.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
				return redirectRes;
			}
		}
	}

	return intlResponse;
}

export const config = {
	matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)']
};
