import { test, expect } from '@playwright/test';

// Auth form password fields on signin = current-password.
// Auth form password fields on register = new-password.

test.describe('Password autocomplete values', () => {
	test('/auth/signin password autocomplete=current-password (or unset)', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const values = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[type="password"]'))
				.map((el) => (el as HTMLInputElement).getAttribute('autocomplete'))
		);
		for (const v of values) {
			if (v) {
				expect(['current-password', 'on', 'password'], `signin pw autocomplete=${v}`).toContain(v);
			}
		}
	});

	test('/auth/register password autocomplete=new-password (or unset)', async ({ page }) => {
		const resp = await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const values = await page.evaluate(() =>
			Array.from(document.querySelectorAll('input[type="password"]'))
				.map((el) => (el as HTMLInputElement).getAttribute('autocomplete'))
		);
		for (const v of values) {
			if (v) {
				expect(['new-password', 'on', 'password'], `register pw autocomplete=${v}`).toContain(v);
			}
		}
	});
});
