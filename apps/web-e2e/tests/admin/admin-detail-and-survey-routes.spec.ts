import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

// Dynamic-segment admin routes: /admin/clients/[id] (requires a real client
// id), /admin/surveys/[slug]/{edit,preview,responses} (require a real
// survey slug). We can't predict valid seed ids, so for the negative case
// we navigate with a placeholder and only assert non-5xx + no signin
// bounce (the page can legitimately render a 404 / not-found state).

const DYNAMIC_ADMIN_ROUTES = [
	{ path: '/admin/clients/non-existent-id-zzz', name: 'Admin client detail (bogus id)' },
	{ path: '/admin/surveys/non-existent-slug-zzz/edit', name: 'Admin edit survey' },
	{ path: '/admin/surveys/non-existent-slug-zzz/preview', name: 'Admin preview survey' },
	{ path: '/admin/surveys/non-existent-slug-zzz/responses', name: 'Admin survey responses' },
	{ path: '/admin/surveys/create', name: 'Admin create survey' }
];

test.describe('Admin dynamic-segment routes', () => {
	test.use({ storageState: ADMIN_STATE_FILE });
	for (const { path, name } of DYNAMIC_ADMIN_ROUTES) {
		test(`${name} (${path}) responds non-5xx for admin`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
			expect(page.url(), `${path} should not bounce admin to signin`).not.toMatch(
				/\/auth\/signin/
			);
		});

		test(`${name} (${path}) gates anonymous`, async ({ browser }) => {
			const ctx = await browser.newContext();
			const anon = await ctx.newPage();
			const resp = await anon.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Three acceptable gate outcomes:
			//   1. The initial server response is 4xx (server component
			//      gated before rendering anything sensitive).
			//   2. The page renders 200 but then the client-side
			//      AdminLayoutClient redirects to /auth/signin or
			//      /admin/auth/signin or /unauthorized.
			//   3. The page renders 200 and AdminLayoutClient shows
			//      its "Redirecting..." placeholder (because the
			//      anonymous session resolves to no user — admin UI
			//      content is never exposed).
			const initialStatus = resp!.status();
			let wasGated = initialStatus === 404 || initialStatus === 401 || initialStatus === 403;
			if (!wasGated) {
				// Race: client redirect to a signin/unauthorized page
				// OR the AdminAuthGuard "Redirecting..." placeholder
				// rendering (proves admin UI did NOT render).
				const redirectPromise = anon
					.waitForURL(/auth\/signin|\/unauthorized/, { timeout: 15_000 })
					.then(() => 'redirect' as const)
					.catch(() => null);
				const placeholderPromise = anon
					.getByText(/redirecting/i)
					.first()
					.waitFor({ state: 'visible', timeout: 15_000 })
					.then(() => 'placeholder' as const)
					.catch(() => null);
				const outcome = await Promise.race([redirectPromise, placeholderPromise]);
				wasGated = outcome !== null;
			}
			expect(wasGated, `${path} (status ${initialStatus}, url ${anon.url()}) should redirect to signin/unauthorized or render the AdminAuthGuard placeholder`).toBe(true);
			await ctx.close();
		});
	}
});
