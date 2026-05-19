import { test, expect } from '@playwright/test';

// Public profile route `/client/profile/[username]` and the followers/following
// sub-pages must respond non-5xx for any (possibly missing) username.

const USERNAME_PROBES = [
	'does-not-exist-zz',
	'admin',
	'sample-user',
	'a'.repeat(64),
	encodeURIComponent('<weird>')
];

test.describe('Public client profile deeper tolerance', () => {
	for (const u of USERNAME_PROBES) {
		test(`/client/profile/${u} non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/client/profile/${u}`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});

		test(`/client/profile/${u}/followers non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/client/profile/${u}/followers`, {
				waitUntil: 'domcontentloaded'
			});
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});

		test(`/client/profile/${u}/following non-5xx`, async ({ page }) => {
			const resp = await page.goto(`/client/profile/${u}/following`, {
				waitUntil: 'domcontentloaded'
			});
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	}
});
