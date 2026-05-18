import { cookies, headers } from 'next/headers';
import type { Session } from 'next-auth';
import { decode } from 'next-auth/jwt';

/**
 * Server-side workaround for Auth.js v5's `auth()` returning null on App
 * Router Server Component pages while it works correctly in API routes
 * (`/api/auth/session`, `/api/current-user`). Reproduced against
 * https://demo.ever.works post-Spec-027: same cookie, same fetch context,
 * but `auth()` on `/client/dashboard` returned null while a direct fetch to
 * `/api/auth/session` returned the user.
 *
 * Strategy:
 *   1. Decode the session JWT *directly* from the cookie using
 *      `next-auth/jwt`'s `decode` — same secret + salt Auth.js itself uses.
 *      This is the fast/cheap path and works without any HTTP round-trip.
 *   2. Only if decoding fails (e.g. an upstream rotation we don't know how
 *      to derive yet), fall back to fetching `/api/auth/session` via the
 *      deployment's private URL — proved to work in repro and bypasses
 *      Cloudflare's HTTP Basic wall on demo.ever.works.
 *
 * Returns null if there is no session (caller redirects). Returns the
 * Session payload if there is one. Never throws — failures return null so
 * the caller redirects to signin (fail closed).
 *
 * See Spec 027 for the full diagnosis and decision log.
 */
const SECURE_COOKIE = '__Secure-authjs.session-token';
const INSECURE_COOKIE = 'authjs.session-token';

async function readSessionToken(): Promise<{ value: string; name: string } | null> {
	const cookieStore = await cookies();
	const c = cookieStore.get(SECURE_COOKIE) ?? cookieStore.get(INSECURE_COOKIE);
	if (!c?.value) return null;
	return { value: c.value, name: c.name };
}

function decodedToSession(token: Record<string, unknown> | null): Session | null {
	if (!token) return null;
	const userId = typeof token.userId === 'string' ? token.userId : (typeof token.sub === 'string' ? token.sub : null);
	if (!userId) return null;
	const session: Session = {
		user: {
			id: userId,
			name: typeof token.name === 'string' ? token.name : null,
			email: typeof token.email === 'string' ? token.email : null,
			image: typeof token.picture === 'string' ? token.picture : null
		} as Session['user'],
		expires:
			typeof token.exp === 'number'
				? new Date(token.exp * 1000).toISOString()
				: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
	};
	// Forward extra fields the app's session callback enriches.
	const extra = session.user as Record<string, unknown>;
	if (typeof token.clientProfileId === 'string') extra.clientProfileId = token.clientProfileId;
	if (typeof token.provider === 'string') extra.provider = token.provider;
	if (typeof token.isAdmin === 'boolean') extra.isAdmin = token.isAdmin;
	if (typeof token.tenantId === 'string') extra.tenantId = token.tenantId;
	return session;
}

export async function getSessionViaApi(): Promise<Session | null> {
	try {
		// Path 1: decode the session JWT directly from the cookie.
		const tokenCookie = await readSessionToken();
		const secret = process.env.AUTH_SECRET ?? process.env.COOKIE_SECRET;
		if (tokenCookie && secret) {
			try {
				const decoded = (await decode({
					token: tokenCookie.value,
					secret,
					salt: tokenCookie.name
				})) as Record<string, unknown> | null;
				const session = decodedToSession(decoded);
				if (session) return session;
			} catch (err) {
				console.error('[getSessionViaApi] JWT decode failed, falling back to /api/auth/session fetch:', err);
			}
		}

		// Path 2 (fallback): fetch /api/auth/session.
		const cookieStore = await cookies();
		const cookieHeader = cookieStore
			.getAll()
			.map((c) => `${c.name}=${c.value}`)
			.join('; ');

		if (!cookieHeader) return null;

		const hdrs = await headers();
		// Prefer the Vercel deployment's private URL when we're on Vercel.
		// This bypasses any CDN/Cloudflare layer in front of the public
		// hostname (demo.ever.works sits behind HTTP Basic at Cloudflare
		// and a server-internal fetch through the public name 401s).
		const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
		let baseUrl: string;
		if (vercelUrl) {
			baseUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
		} else {
			const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
			if (!host) return null;
			const proto =
				hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
			baseUrl = `${proto}://${host}`;
		}

		const resp = await fetch(`${baseUrl}/api/auth/session`, {
			headers: { Cookie: cookieHeader },
			cache: 'no-store'
		});
		if (!resp.ok) return null;
		const session = (await resp.json()) as Session | Record<string, never>;
		if (!session || !('user' in session) || !session.user) return null;
		return session as Session;
	} catch (err) {
		console.error('[getSessionViaApi] failed:', err);
		return null;
	}
}
