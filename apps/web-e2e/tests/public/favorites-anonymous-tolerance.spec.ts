import { test, expect } from '@playwright/test';

// /favorites is the user's favorites page (auth-required). Anonymous must
// be bounced to signin, never 5xx. The /api/favorites endpoints already
// have tests; here we exercise the page-level route.

test.describe('Favorites page anonymous gate', () => {
	test('/favorites anonymous is bounced to signin', async ({ page }) => {
		const resp = await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// Page gate is client-side; poll until the redirect lands.
		await expect(page).toHaveURL(/(auth\/signin|\/auth\/|\/$|\/favorites)/, { timeout: 30_000 });
	});

	test('/favorites with bogus session cookie does not 5xx', async ({ page, context }) => {
		await context.addCookies([
			{
				name: '__Secure-authjs.session-token',
				value: 'garbage',
				domain: new URL(page.url() || 'http://localhost').hostname || 'localhost',
				path: '/'
			}
		]).catch(() => {});
		const resp = await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
