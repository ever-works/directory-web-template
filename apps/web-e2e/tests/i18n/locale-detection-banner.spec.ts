import { test, expect } from '@playwright/test';

/**
 * Locale-suggestion banner — Spec 019, Pattern A.
 *
 * The banner appears after hydration when `navigator.language` differs
 * from the current page locale, the visitor has not previously
 * dismissed it, and they have not previously chosen a locale.
 *
 * These tests use Playwright's per-test `locale` override to spoof
 * `navigator.language`. The default project locale is `en-US`; we
 * pin the page language to French (`fr-FR`) and visit the English
 * default `/`. The banner should render.
 */
test.describe('i18n: locale-suggestion banner', () => {
	test.use({ locale: 'fr-FR' });

	test('appears for non-default browser locale on the default page', async ({ page, context }) => {
		// Make sure no pre-existing cookies suppress the banner.
		await context.clearCookies();

		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const banner = page.getByTestId('locale-suggestion-banner');
		await expect(banner).toBeVisible();

		const switchBtn = page.getByTestId('locale-suggestion-switch');
		await expect(switchBtn).toBeVisible();
		await expect(switchBtn).toContainText(/Français/i);
	});

	test('does not reappear after dismissal', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const dismissBtn = page.getByTestId('locale-suggestion-dismiss');
		await expect(dismissBtn).toBeVisible();
		await dismissBtn.click();

		// Reload — banner must not reappear because the dismiss cookie is set.
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('locale-suggestion-banner')).toHaveCount(0);
	});

	test('does not appear when browser locale matches current page locale', async ({ page, context }) => {
		await context.clearCookies();
		await page.goto('/fr', { waitUntil: 'domcontentloaded' });

		// On the /fr page with browser locale fr-FR, no suggestion is needed.
		// We give the hydration effect a beat then assert the banner stays absent.
		await page.waitForTimeout(500);
		await expect(page.getByTestId('locale-suggestion-banner')).toHaveCount(0);
	});
});

test.describe('i18n: returning-visitor cookie redirect', () => {
	// Cookie scope must come from a real URL — `page.url()` is `about:blank`
	// before any navigation, and `new URL('about:blank').hostname` is `''`,
	// which makes `context.addCookies` throw. Always derive scope from the
	// configured baseURL fixture.

	test('redirects to cookied locale before paint', async ({ page, context, baseURL }) => {
		// Pretend a previous visit set NEXT_LOCALE=fr.
		await context.addCookies([
			{
				name: 'NEXT_LOCALE',
				value: 'fr',
				url: baseURL ?? 'http://localhost:3000',
			},
		]);

		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(response?.status() ?? 0).toBeLessThan(400);

		// The inline <head> script runs synchronously and replaces the URL.
		await expect(page).toHaveURL(/\/fr(\/|$)/);
	});

	test('redirects from non-default locale root to default-locale root when cookie is default', async ({
		page,
		context,
		baseURL,
	}) => {
		// Regression — the original cookie-redirect script computed an empty
		// `rest` for `/fr` which made `location.replace('')` resolve to the
		// current URL, silently leaving the visitor on French. This must
		// navigate to `/`.
		await context.addCookies([
			{
				name: 'NEXT_LOCALE',
				value: 'en',
				url: baseURL ?? 'http://localhost:3000',
			},
		]);

		const response = await page.goto('/fr', { waitUntil: 'domcontentloaded' });
		expect(response?.status() ?? 0).toBeLessThan(400);

		// `/` (default locale, no prefix). Tolerate an exact `/` or anything
		// non-locale-prefixed (in case Next reroutes `/` to `/discover/1` etc).
		await expect(page).not.toHaveURL(/\/fr(\/|$)/);
	});

	test('redirects from non-default locale subpage to default-locale subpage when cookie is default', async ({
		page,
		context,
		baseURL,
	}) => {
		await context.addCookies([
			{
				name: 'NEXT_LOCALE',
				value: 'en',
				url: baseURL ?? 'http://localhost:3000',
			},
		]);

		const response = await page.goto('/fr/categories', { waitUntil: 'domcontentloaded' });
		expect(response?.status() ?? 0).toBeLessThan(400);

		await expect(page).toHaveURL(/\/categories(\/|$|\?)/);
		await expect(page).not.toHaveURL(/\/fr\//);
	});
});
