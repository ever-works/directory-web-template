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
			expect(anon.url()).toMatch(/auth\/signin/);
			await ctx.close();
		});
	}
});
