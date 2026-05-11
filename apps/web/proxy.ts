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
import { getRuntimeAuthSecret } from '@/lib/auth/auth-secret';
import { updateSession as supabaseUpdate } from '@/lib/auth/supabase/middleware';
import { getToken } from 'next-auth/jwt';
import { createSafeCallbackUrl } from '@/lib/auth/validate-callback-url';
import { DEFAULT_LOCALE, type Locale } from '@/lib/constants';
import { isSupportedLocale } from '@/lib/i18n/locale-names';

const intl = createIntlMiddleware(routing);

const ADMIN_PREFIX = '/admin';
const ADMIN_SIGNIN = '/admin/auth/signin';
const ADMIN_API_PREFIX = '/api/admin/';
const authSecret = getRuntimeAuthSecret();

/**
 * Edge-layer guard for `/api/admin/*` routes. Rejects fully-anonymous calls
 * with a 401 JSON envelope that matches what the route handlers return.
 *
 * Intentionally minimal — only checks that *some* auth artefact is present:
 *   - NextAuth: a decodable session JWT
 *   - Supabase: a session cookie (we don't decrypt; just presence)
 *
 * The actual admin-role check still happens at the route level via
 * `checkAdminAuth()` / `requireAdminSession()`. This guard is defense in
 * depth — it catches routes that forget to call the guard, and stops drive-by
 * scanning before it touches application code.
 */
async function adminApiEdgeGuard(req: NextRequest): Promise<NextResponse | null> {
	const cfg = getAuthConfig();

	const unauthorized = () =>
		NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

	if (cfg.provider === 'next-auth' || cfg.provider === 'both') {
		try {
			const token = await getToken({ req, secret: authSecret });
			if (token) return null;
		} catch {
			// Fall through to alternate provider / 401.
		}
	}

	if (cfg.provider === 'supabase' || cfg.provider === 'both') {
		// Supabase cookies follow `sb-<project-ref>-auth-token[.N]`. We don't
		// need to decode them here — the route handler does the real check.
		const hasSupabaseCookie = req.cookies
			.getAll()
			.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
		if (hasSupabaseCookie) return null;
	}

	return unauthorized();
}

/**
 * Locale-detection mode for the *server*. Read from `LOCALE_DETECTION_MODE`
 * env var. Edge middleware cannot read the YAML site config (no fs in
 * Edge runtime), so the server-side strategy is pinned at deploy time.
 *
 * - `server-redirect` — Pattern C from `docs/performance/locale-detection.md`.
 *   Middleware reads `Accept-Language` on first visit and 307s to the
 *   visitor's preferred locale. Disables CDN caching of `/`.
 * - any other value (default) — middleware does NOT redirect. Detection
 *   either happens client-side via `<LocaleSuggestionBanner>` (Pattern A)
 *   or not at all (Pattern B).
 */
const SERVER_REDIRECT_MODE = process.env.LOCALE_DETECTION_MODE === 'server-redirect';

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

/**
 * Pick the visitor's preferred supported locale from the `Accept-Language`
 * header. Returns `null` when none of the visitor's preferences match a
 * supported locale.
 *
 * Used only by Pattern C (`SERVER_REDIRECT_MODE`).
 *
 * Edge-runtime safe — pure JS, no fs / Node APIs.
 */
function pickLocaleFromAcceptLanguage(header: string | null): Locale | null {
	if (!header) return null;
	// Parse `fr-FR,fr;q=0.9,en;q=0.8` — split, normalize, sort by q-weight.
	const candidates = header
		.split(',')
		.map((part) => {
			const trimmed = part.trim();
			const [lang, ...rest] = trimmed.split(';');
			const qMatch = rest.join(';').match(/q=([\d.]+)/);
			const q = qMatch ? parseFloat(qMatch[1]) : 1.0;
			return { lang: (lang || '').trim().toLowerCase(), q };
		})
		.filter((c) => c.lang)
		.sort((a, b) => b.q - a.q);

	for (const { lang } of candidates) {
		// `fr-FR` -> primary subtag `fr`; tolerate plain `fr` too.
		const primary = lang.split('-')[0];
		if (isSupportedLocale(primary)) return primary;
	}
	return null;
}

/**
 * Pattern C — server-side `Accept-Language` redirect.
 *
 * Returns a 307 `NextResponse` redirecting to the visitor's preferred
 * locale, OR `null` when no redirect is needed.
 *
 * Conditions for redirecting:
 *   - `LOCALE_DETECTION_MODE=server-redirect` env var is set.
 *   - The visitor has not already chosen a locale (`NEXT_LOCALE` cookie
 *     unset).
 *   - `Accept-Language` resolves to a supported locale that differs from
 *     the locale segment of the current URL.
 *   - The current path is a public-facing page (we skip API + Next
 *     internals, which the matcher already excludes anyway).
 *
 * Trade-off: by setting the cookie + returning a 307, this response is
 * not edge-cacheable. That is the explicit Pattern C contract — the
 * operator opted into it via the env var.
 */
function maybeServerRedirectForLocale(req: NextRequest): NextResponse | null {
	if (!SERVER_REDIRECT_MODE) return null;

	// Only the GET method makes sense for a locale redirect.
	if (req.method !== 'GET' && req.method !== 'HEAD') return null;

	// Respect explicit user choice.
	const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
	if (cookieLocale && isSupportedLocale(cookieLocale)) return null;

	const browserLocale = pickLocaleFromAcceptLanguage(req.headers.get('accept-language'));
	if (!browserLocale) return null;

	const { hasLocale, locale: pathLocale } = resolveLocalePrefix(req.nextUrl.pathname);
	const currentLocale: Locale = (pathLocale as Locale) ?? DEFAULT_LOCALE;
	if (browserLocale === currentLocale) return null;

	// Compute the rewritten path. Honour `localePrefix: 'as-needed'`:
	// the default locale lives at `/`, others at `/<locale>/`.
	const url = req.nextUrl.clone();
	const restOfPath = hasLocale
		? req.nextUrl.pathname.substring(`/${pathLocale}`.length) || '/'
		: req.nextUrl.pathname;
	if (browserLocale === DEFAULT_LOCALE) {
		url.pathname = restOfPath || '/';
	} else {
		url.pathname = `/${browserLocale}${restOfPath === '/' ? '' : restOfPath}`;
	}

	const redirectRes = NextResponse.redirect(url, 307);
	// Persist the choice so subsequent requests don't keep paying the
	// redirect cost and so the inline `<head>` cookie-redirect script
	// in the layout takes over for return visits.
	redirectRes.cookies.set({
		name: 'NEXT_LOCALE',
		value: browserLocale,
		path: '/',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});
	return redirectRes;
}

/* ────────────────────────────────── Client Auth Guards ────────────────────────────── */

async function nextAuthClientGuard(req: NextRequest, baseRes: NextResponse): Promise<NextResponse | null> {
	try {
		const token = await getToken({ req, secret: authSecret });

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
		const token = await getToken({ req, secret: authSecret });
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

	// Edge guard for /api/admin/*. Stops fully-anonymous calls before they
	// reach the route handler. The route still performs the DB-backed admin
	// role check; this is defense in depth.
	if (originalPathname.startsWith(ADMIN_API_PREFIX)) {
		const blocked = await adminApiEdgeGuard(req);
		if (blocked) return blocked;
		return NextResponse.next();
	}

	// Pattern C — server-side Accept-Language redirect.
	// Opt-in via `LOCALE_DETECTION_MODE=server-redirect`. See Spec 019 and
	// `docs/performance/locale-detection.md`. Runs before `intl()` so we
	// can short-circuit with a 307 instead of letting next-intl render the
	// "wrong" locale and rely on a client-side switch.
	const serverLocaleRedirect = maybeServerRedirectForLocale(req);
	if (serverLocaleRedirect) return serverLocaleRedirect;

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
			const token = await getToken({ req, secret: authSecret });
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
			const token = await getToken({ req, secret: authSecret });
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
			const token = await getToken({ req, secret: authSecret });
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
			const token = await getToken({ req, secret: authSecret });
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
	matcher: [
		// Page routes (excludes /api, /trpc, Next internals, and asset files)
		'/((?!api|trpc|_next|_vercel|.*\\..*).*)',
		// Edge guard for admin API surface — see `adminApiEdgeGuard`
		'/api/admin/:path*'
	]
};
