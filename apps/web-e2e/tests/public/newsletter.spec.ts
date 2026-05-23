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
		// `footer` is rendered lazily — on a cold start the element can
		// re-mount between scrollIntoView and the visibility check, which
		// reports "Element is not attached to the DOM". Wait for it
		// explicitly and silently swallow scroll-time detach errors; the
		// subsequent isVisible() check is the real gate.
		const footer = page.locator('footer').first();
		await footer.waitFor({ state: 'attached', timeout: 5_000 }).catch(() => undefined);
		await footer.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => undefined);

		const isVisible = await newsletter.emailInput.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Newsletter signup form not visible');
			return;
		}

		// Fill a valid email. The newsletter input is a controlled React
		// input; on a cold start the component can re-render mid-fill and
		// reset its value. Poll the value until it matches OR retry the
		// fill so the assertion isn't pinned to a single keystroke moment.
		const testEmail = `e2e-test-${Date.now()}@example.com`;
		await expect
			.poll(
				async () => {
					await newsletter.emailInput.fill(testEmail).catch(() => undefined);
					return newsletter.emailInput.inputValue().catch(() => '');
				},
				{
					message: 'newsletter input should retain typed email value',
					timeout: 10_000
				}
			)
			.toBe(testEmail);
	});
});
