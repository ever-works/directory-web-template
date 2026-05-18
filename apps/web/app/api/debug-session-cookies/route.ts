// TEMPORARY diagnostic endpoint for Spec 027. Will be removed once the
// page-context auth() / cookies() issue is fully understood.
//
// Returns:
//   - what cookies() sees server-side (names + presence + length, never values)
//   - what header context exists
//   - whether next-auth/jwt can decode the session token if found
//
// Hit from outside with a valid session cookie attached:
//   curl -b cookies.txt https://demo.ever.works/api/debug-session-cookies

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { decode } from 'next-auth/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
	const cookieStore = await cookies();
	const all = cookieStore.getAll();
	const cookieSummary = all.map((c) => ({ name: c.name, length: c.value.length }));

	const sec = cookieStore.get('__Secure-authjs.session-token');
	const insec = cookieStore.get('authjs.session-token');
	const tokenCookie = sec ?? insec;

	const hdrs = await headers();
	const headerKeys = Array.from(hdrs.keys());

	let decodeAttempt: { ok: boolean; error?: string; userId?: string | null; name?: string | null; tenantId?: string | null } | null = null;
	if (tokenCookie) {
		try {
			const secret = process.env.AUTH_SECRET ?? process.env.COOKIE_SECRET;
			if (!secret) {
				decodeAttempt = { ok: false, error: 'no AUTH_SECRET or COOKIE_SECRET in env' };
			} else {
				const decoded = (await decode({
					token: tokenCookie.value,
					secret,
					salt: tokenCookie.name
				})) as Record<string, unknown> | null;
				if (decoded) {
					decodeAttempt = {
						ok: true,
						userId: typeof decoded.userId === 'string' ? decoded.userId : (typeof decoded.sub === 'string' ? decoded.sub : null),
						name: typeof decoded.name === 'string' ? decoded.name : null,
						tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : null
					};
				} else {
					decodeAttempt = { ok: false, error: 'decode returned null' };
				}
			}
		} catch (err) {
			decodeAttempt = { ok: false, error: (err as Error).message ?? String(err) };
		}
	}

	return NextResponse.json({
		cookies: cookieSummary,
		hasSecureSessionCookie: !!sec,
		hasInsecureSessionCookie: !!insec,
		tokenCookieName: tokenCookie?.name ?? null,
		tokenCookieLength: tokenCookie?.value.length ?? null,
		headerKeys,
		authSecretSet: !!process.env.AUTH_SECRET,
		cookieSecretSet: !!process.env.COOKIE_SECRET,
		vercelUrl: process.env.VERCEL_URL ?? null,
		decodeAttempt
	});
}
