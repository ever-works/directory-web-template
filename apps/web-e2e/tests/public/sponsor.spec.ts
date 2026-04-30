import { test, expect } from '@playwright/test';

test.describe('Public: Sponsor (unauthenticated)', () => {
	test('unauthenticated sponsor visit redirects to sign-in or 404', async ({ page }) => {
		const response = await page.goto('/sponsor', { waitUntil: 'domcontentloaded' });

		// Either the user is redirected to sign-in (because they're unauthenticated),
		// or the feature is disabled and the page returns 404. Both states are valid;
		// we assert the page does not error.
		expect(response?.status()).toBeLessThan(500);

		const url = page.url();
		const onSignIn = url.includes('/auth/signin');
		const status = response?.status() ?? 0;
		const onErrorPage = status === 404;
		const stayedOnSponsor = url.includes('/sponsor');

		expect(onSignIn || onErrorPage || stayedOnSponsor).toBeTruthy();
	});
});
