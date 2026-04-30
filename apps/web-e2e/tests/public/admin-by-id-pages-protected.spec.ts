import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/admin/**` page routes that require an `[id]` /
 * `[slug]` segment. Even with a fake / non-existent value, the auth +
 * admin-role guard must redirect to the signin page (3xx) or render
 * an unauthorized / not-found page — never a 5xx.
 *
 * Complements `admin-pages-protected.spec.ts` (collection-level admin
 * pages) and `dashboard-surveys-protected.spec.ts` (owner dashboard
 * survey routes).
 */
const FAKE_ID = '__no_such_id__';
const FAKE_SLUG = '__no-such-slug__';

const PROTECTED_ADMIN_ID_PAGES = [
	`/admin/clients/${FAKE_ID}`,
	`/admin/surveys/${FAKE_SLUG}/edit`,
	`/admin/surveys/${FAKE_SLUG}/preview`,
	`/admin/surveys/${FAKE_SLUG}/responses`,
	`/admin/auth/signin`,
	// Client self-service pages — auth-gated owner surfaces.
	`/client/dashboard`,
	`/client/profile/${FAKE_SLUG}`,
	`/client/settings`,
	`/client/settings/profile/basic-info`,
	`/client/settings/profile/billing`,
	`/client/settings/profile/location`,
	`/client/settings/profile/portfolio`,
	`/client/settings/profile/submissions/trash`,
	`/client/settings/profile/theme-colors`,
	`/client/settings/security`,
	`/client/sponsorships`,
	`/client/submissions`,
	`/client/submissions/trash`,
] as const;

test.describe('Public: Admin / client by-id pages reject anonymous visitors', () => {
	for (const path of PROTECTED_ADMIN_ID_PAGES) {
		test(`GET ${path} responds without a server error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
