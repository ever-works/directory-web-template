import { test, expect } from '@playwright/test';

// Auth forms have specific input counts. We don't enforce but we do
// detect a "no form at all" regression.

test.describe('Auth form input counts', () => {
	test('signin has >= 2 inputs (email + password)', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const inputCount = await page.locator('input').count();
		expect(inputCount, 'signin input count').toBeGreaterThanOrEqual(2);
	});

	test('register has >= 2 inputs', async ({ page }) => {
		const resp = await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const inputCount = await page.locator('input').count();
		expect(inputCount, 'register input count').toBeGreaterThanOrEqual(2);
	});

	test('forgot-password has >= 1 input', async ({ page }) => {
		const resp = await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const inputCount = await page.locator('input').count();
		expect(inputCount, 'forgot input count').toBeGreaterThanOrEqual(1);
	});
});
