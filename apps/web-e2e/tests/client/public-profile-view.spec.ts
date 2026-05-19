import { test, expect } from '@playwright/test';

// Anonymous users CAN see a public profile page. Hostile / non-existent
// usernames should 404, not 500. Authenticated users see additional
// affordances (follow button, "Edit profile" link) — owned by
// client/profile.spec.ts; here we just guarantee the public read path.

test.describe('Public profile read', () => {
	test('non-existent profile slug 404s (not 5xx)', async ({ page }) => {
		const resp = await page.goto('/client/profile/user-that-does-not-exist-zzz', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status(), `non-existent profile`).toBeLessThan(500);
	});

	test('profile with special chars in slug does not 5xx', async ({ page }) => {
		const resp = await page.goto('/client/profile/' + encodeURIComponent("user'name<x>"), {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/client/users index renders anonymously', async ({ page }) => {
		const resp = await page.goto('/client/users', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/client/users with ?page=999999 does not 5xx', async ({ page }) => {
		const resp = await page.goto('/client/users?page=999999', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});
});
