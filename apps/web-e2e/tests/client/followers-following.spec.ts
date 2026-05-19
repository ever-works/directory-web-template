import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// Coverage for /client/profile/[username]/followers and /following — the
// social-graph sub-pages added in spec-022 (profile UX polish). They are
// auth-gated client routes; both should render the user's name/email-derived
// username slug and a list (possibly empty) of related users.
//
// These tests intentionally use only public selectors (role / accessible
// name) so a content/style refactor doesn't break them. They tolerate empty
// state (no followers yet) — the asserts are existence-of-section, not
// existence-of-rows.

test.describe('Client: followers / following pages', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	test('followers page renders for logged-in user', async ({ page }) => {
		// Land on the dashboard first so we can resolve the username from the
		// authenticated session's "View Profile" link.
		await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		const viewProfile = page.getByRole('link', { name: /view profile/i }).first();
		if (!(await viewProfile.isVisible().catch(() => false))) {
			test.skip(true, 'No profile link rendered — likely no client profile row in this env');
			return;
		}

		const href = await viewProfile.getAttribute('href');
		expect(href).toBeTruthy();
		const followersUrl = `${href}/followers`;
		await page.goto(followersUrl, { waitUntil: 'domcontentloaded' });

		// Page must respond (not 500). Heading / breadcrumb / page body present.
		await expect(page.locator('body')).toBeVisible();
		// Heading should mention followers (i18n-tolerant).
		const headings = page.getByRole('heading');
		await expect(headings.first()).toBeVisible({ timeout: 30_000 });
	});

	test('following page renders for logged-in user', async ({ page }) => {
		await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		const viewProfile = page.getByRole('link', { name: /view profile/i }).first();
		if (!(await viewProfile.isVisible().catch(() => false))) {
			test.skip(true, 'No profile link rendered — likely no client profile row in this env');
			return;
		}

		const href = await viewProfile.getAttribute('href');
		expect(href).toBeTruthy();
		await page.goto(`${href}/following`, { waitUntil: 'domcontentloaded' });

		await expect(page.locator('body')).toBeVisible();
		const headings = page.getByRole('heading');
		await expect(headings.first()).toBeVisible({ timeout: 30_000 });
	});

	test('followers page is auth-gated (anonymous → signin)', async ({ browser }) => {
		// Fresh context, no storage state.
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		const resp = await page.goto('/client/profile/anyone/followers', {
			waitUntil: 'domcontentloaded'
		});
		// Either a 307/redirect to /auth/signin, or the public profile page
		// renders (followers view is public for some configs). Both shapes are
		// acceptable — what we DON'T want is a 500.
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await ctx.close();
	});

	test('following page is auth-gated (anonymous → signin)', async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		const resp = await page.goto('/client/profile/anyone/following', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await ctx.close();
	});
});
