import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE, ADMIN_STATE_FILE } from '../../helpers/test-data';

// Coverage matrix for /dashboard/* routes (the older "dashboard" surface
// that lives alongside /client/*). Includes /dashboard/billing and the
// survey-management sub-routes. Spec 027 fixed the canonical /client
// dashboard; this matrix ensures the legacy /dashboard surface also gates
// correctly and doesn't 5xx.

const DASHBOARD_ROUTES_AUTHED_OK: Array<{ path: string; name: string }> = [
	{ path: '/dashboard/billing', name: 'Dashboard billing' }
];

const DASHBOARD_ROUTES_NEED_ITEM_FIXTURE: Array<{ path: string; name: string }> = [
	// These require a real itemId + surveySlug. We can only assert non-5xx
	// when navigating to them with a placeholder — a 404 is acceptable.
	{
		path: '/dashboard/items/non-existent-item-id/surveys',
		name: 'Dashboard item surveys (404 OK)'
	}
];

test.describe('Dashboard routes — authenticated client', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	for (const { path, name } of DASHBOARD_ROUTES_AUTHED_OK) {
		test(`${name} (${path}) loads for client`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path} should not 5xx`).toBeLessThan(500);
			await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
		});
	}

	for (const { path, name } of DASHBOARD_ROUTES_NEED_ITEM_FIXTURE) {
		test(`${name} (${path}) responds non-5xx for client`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path} should not 5xx`).toBeLessThan(500);
		});
	}
});

test.describe('Dashboard routes — admin can access', () => {
	test.use({ storageState: ADMIN_STATE_FILE });
	for (const { path, name } of DASHBOARD_ROUTES_AUTHED_OK) {
		test(`${name} (${path}) also works for admin`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	}
});

test.describe('Dashboard routes — anonymous gated', () => {
	for (const { path, name } of DASHBOARD_ROUTES_AUTHED_OK) {
		test(`${name} (${path}) bounces anon to signin`, async ({ browser }) => {
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
