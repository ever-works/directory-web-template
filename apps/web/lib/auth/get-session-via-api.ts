import { cookies, headers } from 'next/headers';
import type { Session } from 'next-auth';

/**
 * Server-side workaround for Auth.js v5's `auth()` returning null on App
 * Router Server Component pages while it works correctly in API routes
 * (`/api/auth/session`, `/api/current-user`). Reproduced against
 * https://demo.ever.works post-Spec-027: same cookie, same fetch context,
 * but `auth()` on `/client/dashboard` returned null while a direct fetch to
 * `/api/auth/session` returned the user.
 *
 * This helper does the same thing the dashboard would have done via
 * `useSession` on the client — fetch `/api/auth/session` with the incoming
 * request's cookies forwarded — but server-side so the auth gate happens
 * BEFORE we send any HTML.
 *
 * Returns null if there is no session (caller redirects). Returns the
 * Session payload if there is one. Never throws — fetch failures return
 * null so the caller redirects to signin (fail closed).
 *
 * Cost: one same-region HTTP roundtrip per page render. Auth-gated pages
 * are already dynamic (no static cache to lose), so the overhead is bounded.
 *
 * See Spec 027 for the full diagnosis and decision log.
 */
export async function getSessionViaApi(): Promise<Session | null> {
	try {
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
