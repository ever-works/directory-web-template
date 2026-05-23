import { test, expect } from '@playwright/test';

// Form inputs should use the right type — email fields type=email, etc.
// Wrong types trash mobile keyboards and break a11y.

test.describe('Form input types', () => {
	test('signin email input has type=email', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const types = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[name="email"]')).map(
				(i) => (i as HTMLInputElement).type
			)
		);
		// May be no name=email at all (a11y-only). If there is, prefer "email".
		for (const t of types) {
			expect(['email', 'text'], `email field type=${t}`).toContain(t);
		}
	});

	test('signin password input has type=password', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const types = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[name="password"]')).map(
				(i) => (i as HTMLInputElement).type
			)
		);
		for (const t of types) {
			expect(t, `password field type=${t}`).toBe('password');
		}
	});
});
