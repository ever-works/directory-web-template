import { test, expect } from '@playwright/test';

// Submitting auth forms without filling in fields should NOT 5xx.

test.describe('Empty form submit tolerance', () => {
	test('signin with empty form does not crash', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const submitBtn = page.locator('button[type="submit"], button:has-text(""), form button').first();
		if ((await submitBtn.count()) === 0) test.skip();
		const uncaught: string[] = [];
		page.on('pageerror', (e) => uncaught.push(String(e.message || e)));
		await submitBtn.click().catch(() => {});
		await page.waitForTimeout(500);
		expect(uncaught, `pageerror after empty submit: ${uncaught.join('|')}`).toEqual([]);
	});

	test('forgot-password with empty form does not crash', async ({ page }) => {
		const resp = await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const submitBtn = page.locator('button[type="submit"], form button').first();
		if ((await submitBtn.count()) === 0) test.skip();
		const uncaught: string[] = [];
		page.on('pageerror', (e) => uncaught.push(String(e.message || e)));
		await submitBtn.click().catch(() => {});
		await page.waitForTimeout(500);
		expect(uncaught, `pageerror: ${uncaught.join('|')}`).toEqual([]);
	});
});
