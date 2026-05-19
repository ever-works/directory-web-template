import { test, expect } from '@playwright/test';

// Auth forms must declare autocomplete attributes — required by password
// managers and a11y. We tolerate missing only with a warning, but flag
// outright wrong values.

const BAD_AUTOCOMPLETE_FOR_PASSWORD = ['off', 'false', 'no'];

test.describe('Autocomplete attributes on auth forms', () => {
	test('signin form password autocomplete is not "off"', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const wrong = await page.evaluate((bad) => {
			return Array.from(document.querySelectorAll('input[type="password"]'))
				.map((el) => (el as HTMLInputElement).getAttribute('autocomplete') || '')
				.filter((v) => bad.includes(v.trim().toLowerCase()));
		}, BAD_AUTOCOMPLETE_FOR_PASSWORD);
		expect(wrong, `password autocomplete=off — breaks password managers: ${wrong}`).toEqual([]);
	});

	test('register form password autocomplete is not "off"', async ({ page }) => {
		const resp = await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const wrong = await page.evaluate((bad) => {
			return Array.from(document.querySelectorAll('input[type="password"]'))
				.map((el) => (el as HTMLInputElement).getAttribute('autocomplete') || '')
				.filter((v) => bad.includes(v.trim().toLowerCase()));
		}, BAD_AUTOCOMPLETE_FOR_PASSWORD);
		expect(wrong, `register pw autocomplete=off: ${wrong}`).toEqual([]);
	});
});
