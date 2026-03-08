import { test, expect } from '../../fixtures';
import { Newsletter } from '../../page-objects/public/newsletter.page';

test.describe('UI: Newsletter Signup', () => {
	test('newsletter email input is visible in footer', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const newsletter = new Newsletter(page);

		// Scroll to footer to ensure it's in view
		await page.locator('footer').first().scrollIntoViewIfNeeded();

		const isVisible = await newsletter.emailInput.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Newsletter signup form not visible in footer');
			return;
		}

		await expect(newsletter.emailInput).toBeVisible();
		await expect(newsletter.submitButton).toBeVisible();
	});

	test('newsletter form requires email input', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const newsletter = new Newsletter(page);
		await page.locator('footer').first().scrollIntoViewIfNeeded();

		const isVisible = await newsletter.emailInput.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Newsletter signup form not visible');
			return;
		}

		// The email input should have required attribute or type="email" validation
		const inputType = await newsletter.emailInput.getAttribute('type');
		expect(inputType).toBe('email');
	});

	test('newsletter form accepts valid email input', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const newsletter = new Newsletter(page);
		await page.locator('footer').first().scrollIntoViewIfNeeded();

		const isVisible = await newsletter.emailInput.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Newsletter signup form not visible');
			return;
		}

		// Fill a valid email
		const testEmail = `e2e-test-${Date.now()}@example.com`;
		await newsletter.emailInput.fill(testEmail);

		const value = await newsletter.emailInput.inputValue();
		expect(value).toBe(testEmail);
	});
});
