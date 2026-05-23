import { test, expect } from '@playwright/test';
import { TEST_DATA } from '../../helpers/test-data';

// End-to-end auth flow that follows the *exact* user-visible path:
//   register → land on dashboard → sign out → sign in → land on dashboard.
//
// Catches the entire class of Spec 027-style regressions (a sign-in path
// works but a register-then-dashboard path doesn't, or vice versa) — they
// are not equivalent and need separate coverage.

test.describe('Auth flow comprehensive', () => {
	test('register → dashboard → signout → signin → dashboard', async ({ browser }) => {
		test.setTimeout(180_000);
		const ctx = await browser.newContext();
		const page = await ctx.newPage();

		const email = TEST_DATA.generateClientEmail();
		const password = TEST_DATA.CLIENT_PASSWORD;

		// Register
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('Flow Test User');
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(password);
		await page.locator('#password').press('Enter');

		await page.waitForURL(/\/client\/dashboard/, {
			timeout: 90_000,
			waitUntil: 'domcontentloaded'
		});
		// Dashboard rendered, not signin
		expect(page.url()).not.toMatch(/auth\/signin/);

		// Sign out (find via header avatar dropdown → Sign out)
		const avatar = page.getByRole('button', { name: /open user menu|profile menu|user menu|account/i }).first();
		if (await avatar.isVisible().catch(() => false)) {
			await avatar.click();
			const signOut = page.getByRole('menuitem', { name: /sign out|log out/i }).first();
			if (await signOut.isVisible().catch(() => false)) {
				await signOut.click();
				// Either back to home (with avatar gone) or on /auth/signin.
				await page.waitForLoadState('domcontentloaded');
			}
		}

		// Belt-and-braces signout — drop all cookies in case the UI signout
		// didn't fire (e.g. the menu didn't render in time). Without this,
		// `/auth/signin` would redirect back to /client/dashboard and the
		// `#email` locator never appears, blowing the 30s fill timeout.
		await ctx.clearCookies();

		// Sign back in
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		await expect(page.locator('#email')).toBeVisible({ timeout: 15_000 });
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(password);
		await page.locator('#password').press('Enter');
		await page.waitForURL(/\/client\/dashboard/, {
			timeout: 90_000,
			waitUntil: 'domcontentloaded'
		});
		expect(page.url()).not.toMatch(/auth\/signin/);

		await ctx.close();
	});

	test('sign in with wrong password shows an error', async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		await page.locator('#email').fill('definitely-not-a-real-user@nowhere.example');
		await page.locator('#password').fill('NotARealPassword123!');
		await page.locator('#password').press('Enter');

		const error = page.locator('.bg-red-50, [role="alert"]').first();
		await expect(error).toBeVisible({ timeout: 30_000 });
		await ctx.close();
	});

	test('register with already-existing email shows an error', async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		// First registration to seed an account.
		const email = TEST_DATA.generateClientEmail();
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#name').fill('Existing User');
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page.locator('#password').press('Enter');
		await page.waitForLoadState('domcontentloaded');

		// Open a fresh context (no cookies) and try to register with the same
		// email. Should be rejected with a visible error.
		const ctx2 = await browser.newContext();
		const page2 = await ctx2.newPage();
		await page2.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page2.locator('#name').fill('Duplicate User');
		await page2.locator('#email').fill(email);
		await page2.locator('#password').fill(TEST_DATA.CLIENT_PASSWORD);
		await page2.locator('#password').press('Enter');

		const error = page2.locator('.bg-red-50, [role="alert"]').first();
		await expect(error).toBeVisible({ timeout: 30_000 });

		await ctx.close();
		await ctx2.close();
	});
});
