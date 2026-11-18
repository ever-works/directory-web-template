import { test, expect } from '@playwright/test';

// T-2646 — /client/notifications and /client/notifications/preferences send a
// visitor without a valid session to the sign-in page that exists.
//
// `proxy.ts` lets any /client/* request that carries a session cookie through to
// the page, even when the cookie does not decode, so the page's own signed-out
// branch decides where the visitor lands. Both pages redirected to
// `/auth/sign-in`, which is not a route (sign-in lives at `/auth/signin`), so the
// visitor got a 404. A garbage session cookie reproduces that path.

const PAGES = ['/client/notifications', '/client/notifications/preferences'];

test.describe('Client notifications: signed-out redirect', () => {
	for (const path of PAGES) {
		test(`${path} with an invalid session cookie lands on /auth/signin`, async ({ page, context, baseURL }) => {
			await context.addCookies([
				{ name: 'authjs.session-token', value: 'garbage', url: baseURL ?? 'http://localhost:3000' }
			]);

			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path} should not end on a 404 or 5xx`).toBeLessThan(400);

			const landed = new URL(page.url());
			expect(landed.pathname).toMatch(/\/auth\/signin$/);
			expect(landed.searchParams.get('callbackUrl') ?? '').toMatch(new RegExp(`${path}$`));
		});
	}
});
