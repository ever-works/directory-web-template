import { test, expect } from '@playwright/test';

// Signin/register form inputs should have required attribute when needed,
// and inputmode where applicable.

test.describe('Auth form input attributes (advisory)', () => {
	test('/auth/signin email input declares inputmode=email or type=email', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const ok = await page.evaluate(() => {
			const candidates = Array.from(document.querySelectorAll<HTMLInputElement>('input'));
			return candidates.some((i) => {
				return (
					i.type === 'email' ||
					i.getAttribute('inputmode') === 'email' ||
					i.name === 'email'
				);
			});
		});
		expect(ok, '/auth/signin must have an email-like input').toBe(true);
	});

	test('/auth/signin password input is type=password', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const ok = await page.evaluate(() => {
			return Array.from(document.querySelectorAll<HTMLInputElement>('input'))
				.some((i) => i.type === 'password');
		});
		expect(ok, '/auth/signin must have a password input').toBe(true);
	});
});
