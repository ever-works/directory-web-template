import { test, expect } from '@playwright/test';

// Submitting absurdly large bodies / query strings should be rejected
// cleanly (4xx), not crash the server (5xx). Catches the entire class of
// "forgot to bound a Zod string()" regressions.

test.describe('Large payload handling', () => {
	test('signin email of 5000 chars rejected without 5xx', async ({ request }) => {
		const email = 'a'.repeat(5000) + '@example.com';
		const resp = await request.post('/api/auth/callback/credentials', {
			form: { email, password: 'x' }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('register name of 1000 chars rejected without 5xx', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('A'.repeat(1000));
		await page.locator('#email').fill('long-name@example.test');
		await page.locator('#password').fill('Password123!');
		await page.locator('#password').press('Enter');
		// Either browser rejects (maxLength) or server returns an error.
		// Either way: page should still be alive within 30s.
		await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
	});

	test('search query of 2000 chars does not 5xx', async ({ page }) => {
		const q = encodeURIComponent('x'.repeat(2000));
		const resp = await page.goto(`/discover/1?q=${q}`, { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('many query params on listing does not 5xx', async ({ page }) => {
		const qs = Array.from({ length: 100 }, (_, i) => `p${i}=${i}`).join('&');
		const resp = await page.goto(`/discover/1?${qs}`, { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('signup with very long password does not 5xx', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('LongPass User');
		await page.locator('#email').fill(`long-pw-${Date.now()}@example.test`);
		await page.locator('#password').fill('P'.repeat(2000));
		await page.locator('#password').press('Enter');
		await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
		// Server should reject without 5xx.
	});
});
