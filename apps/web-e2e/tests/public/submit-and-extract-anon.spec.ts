import { test, expect } from '@playwright/test';

// /submit page should render an entry form OR bounce to signin. Anonymous
// behavior must not 5xx.

test.describe('Submit page anonymous behavior', () => {
	test('/submit GET non-5xx', async ({ page }) => {
		const resp = await page.goto('/submit', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/submit has a form, OR bounces to signin', async ({ page }) => {
		const resp = await page.goto('/submit', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const onSignin = page.url().includes('/auth/signin');
		const formCount = await page.locator('form').count();
		expect(onSignin || formCount > 0, 'either signin bounce or form present').toBe(true);
	});

	test('/submit POST without auth non-5xx', async ({ request }) => {
		// /submit is a page, not an endpoint, but probe just in case.
		const resp = await request.post('/submit', { data: { name: 'probe' } });
		expect(resp.status()).toBeLessThan(500);
	});
});
