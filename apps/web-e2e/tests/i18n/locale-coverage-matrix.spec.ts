import { test, expect } from '@playwright/test';

// Walk every supported locale on every "core" public page. With
// localePrefix='as-needed' the default (en) is unprefixed; others are
// prefixed. Tests assert non-5xx + heading + that the <html lang> attribute
// matches the URL locale (catches the class of next-intl bugs where the
// page renders but with the wrong translation bundle).
//
// Locales pulled from lib/constants — keep in sync.

const LOCALES = ['en', 'fr', 'es', 'de', 'ar', 'zh'] as const;
const CORE_PAGES = ['/', '/about', '/help', '/categories', '/tags', '/auth/signin'] as const;

test.describe('i18n locale × page coverage', () => {
	for (const locale of LOCALES) {
		for (const page of CORE_PAGES) {
			const url = locale === 'en' ? page : `/${locale}${page === '/' ? '' : page}`;
			test(`${locale.toUpperCase()} ${page} (${url})`, async ({ page: pw }) => {
				const resp = await pw.goto(url, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `${url} should not 5xx`).toBeLessThan(500);
				if (resp!.status() < 400) {
					// Heading should be visible
					await expect(pw.getByRole('heading').first()).toBeVisible({ timeout: 20_000 });
					// <html lang> should at least include the language code (next-intl
					// emits e.g. "en", "fr"; some setups emit "en-US" for default).
					const htmlLang = await pw.locator('html').getAttribute('lang');
					expect(htmlLang, `${url} <html lang>`).toBeTruthy();
					expect(htmlLang!.toLowerCase().startsWith(locale)).toBe(true);
				}
			});
		}
	}
});
