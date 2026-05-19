import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// Coverage for every /client/settings/profile/* sub-page added across
// spec-022 (profile UX polish), spec-024 (activity feed wiring), and the
// recurring continual-improvement runs. Each tab is auth-gated and renders
// its own server-component form; if the tab were silently broken the suite
// caught nothing about it before this spec.
//
// Each subtest just asserts: page responds (not 5xx), heading present, no
// "Sign in" prompt (i.e. the auth gate accepted us). Content-specific
// behaviour (avatar upload, theme picker, etc.) is owned by the dedicated
// specs in this folder.

const SETTINGS_SUBROUTES = [
	{ path: '/client/settings', name: 'Settings hub' },
	{ path: '/client/settings/profile/basic-info', name: 'Basic info' },
	{ path: '/client/settings/profile/billing', name: 'Profile billing' },
	{ path: '/client/settings/profile/location', name: 'Location' },
	{ path: '/client/settings/profile/portfolio', name: 'Portfolio' },
	{ path: '/client/settings/profile/theme-colors', name: 'Theme colors' },
	{ path: '/client/settings/profile/submissions/trash', name: 'Profile submissions trash' },
	{ path: '/client/settings/security', name: 'Security' }
] as const;

test.describe('Client: settings sub-routes coverage matrix', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	for (const { path, name } of SETTINGS_SUBROUTES) {
		test(`${name} (${path}) renders for authenticated client`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp, `expected response for ${path}`).toBeTruthy();
			expect(resp!.status(), `${path} should not 5xx`).toBeLessThan(500);

			// Must NOT have been bounced to /auth/signin.
			expect(page.url(), `${path} should not redirect to signin when authenticated`).not.toMatch(
				/\/auth\/signin/
			);

			// At least one heading on the page (validates SSR completed).
			const headings = page.getByRole('heading');
			await expect(headings.first()).toBeVisible({ timeout: 30_000 });
		});

		test(`${name} (${path}) is auth-gated for anonymous users`, async ({ browser }) => {
			const ctx = await browser.newContext();
			const anon = await ctx.newPage();
			const resp = await anon.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Anonymous must land on signin (callback URL preserves where they came from).
			expect(anon.url()).toMatch(/\/auth\/signin/);
			await ctx.close();
		});
	}
});
