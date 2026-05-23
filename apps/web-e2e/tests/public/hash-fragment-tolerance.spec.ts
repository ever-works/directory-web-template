import { test, expect } from '@playwright/test';

// URL hash fragments are used for in-page anchors and as routing flags by
// some integrations. Pages should ignore unknown hashes gracefully.

const HASH_PROBES = [
	'#section-1',
	'#%26weird-encoded',
	'#' + 'a'.repeat(200),
	'#redirect=' + encodeURIComponent('https://evil.example/'),
	'#error=oauth_error',
	'#access_token=fake'
];

test.describe('Hash fragment tolerance', () => {
	for (const hash of HASH_PROBES) {
		test(`home with ${hash.slice(0, 20)} does not crash`, async ({ page }) => {
			const resp = await page.goto(`/${hash}`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	}

	test('signin with #access_token=fake does NOT auto-sign-in', async ({ page }) => {
		await page.goto('/auth/signin#access_token=fake-token-xyz', {
			waitUntil: 'domcontentloaded'
		});
		// We should still be on /auth/signin with the form visible.
		await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
		expect(page.url()).toContain('/auth/signin');
	});
});
