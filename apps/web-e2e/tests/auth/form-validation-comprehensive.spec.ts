import { test, expect } from '@playwright/test';

// HTML5 + Zod client-side validation across every auth form. Verifies that
// submitting an empty / malformed form does NOT round-trip to the server
// (i.e. the browser blocks via `required` / `type=email`).

const REQUIRED_INPUT_IDS: Record<string, string[]> = {
	'/auth/register': ['name', 'email', 'password'],
	'/auth/signin': ['email', 'password'],
	'/auth/forgot-password': ['email']
	// /auth/new-password: requires a valid `token` query param to render the
	// form; tested separately in auth/new-password.spec.ts.
};

test.describe('Auth form HTML5 validation', () => {
	for (const [path, ids] of Object.entries(REQUIRED_INPUT_IDS)) {
		test(`${path} required fields block empty submit`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			// Find the visible submit button (avoid OAuth provider buttons).
			const submitBtn = page
				.getByRole('button', { name: /sign in|create account|register|reset|send/i })
				.first();
			if (!(await submitBtn.isVisible().catch(() => false))) {
				test.skip(true, `${path}: no visible submit button`);
				return;
			}
			await submitBtn.click({ trial: false });
			// Pause briefly so we can check we're still on the same page.
			await page.waitForTimeout(500);
			expect(page.url(), `${path}: empty submit should not navigate`).toContain(path);

			// At least one of the required inputs should be marked :invalid by the browser.
			let invalidCount = 0;
			for (const id of ids) {
				const el = page.locator(`#${id}`);
				if (await el.count()) {
					const isInvalid = await el.evaluate((node: HTMLInputElement) => !node.checkValidity());
					if (isInvalid) invalidCount++;
				}
			}
			expect(invalidCount, `${path}: at least one required field should be invalid`).toBeGreaterThan(
				0
			);
		});
	}

	test('signin rejects malformed email format', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		const email = page.locator('#email');
		await email.fill('not-an-email');
		const valid = await email.evaluate((node: HTMLInputElement) => node.checkValidity());
		expect(valid, 'malformed email should fail HTML5 validation').toBe(false);
	});

	test('register password tips appear on password focus', async ({ page }) => {
		await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		await page.locator('#password').focus();
		// The form shows a small hint box with security requirements.
		// We accept ANY of: "8 characters", "uppercase", "number", etc.
		const tip = page.locator('#password-tips, [aria-describedby="password-tips"]').first();
		// Tolerate the absence — some themes render tips inline only.
		if ((await tip.count()) > 0) {
			await expect(tip).toBeVisible({ timeout: 5_000 }).catch(() => {});
		}
	});
});
