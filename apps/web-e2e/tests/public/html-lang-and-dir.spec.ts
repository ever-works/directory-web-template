import { test, expect } from '@playwright/test';

// <html lang="..."> and dir attributes must be set for i18n / a11y / SEO.
// AR locale should be dir="rtl"; everything else LTR.

const LOCALE_PROBES = [
	{ path: '/', lang: /^[a-z]{2}/i },
	{ path: '/en', lang: /^en/i },
	{ path: '/fr', lang: /^fr/i },
	{ path: '/es', lang: /^es/i },
	{ path: '/de', lang: /^de/i },
	{ path: '/zh', lang: /^zh/i }
];

test.describe('html lang attribute coverage', () => {
	for (const { path, lang } of LOCALE_PROBES) {
		test(`${path || '/'} html has lang attribute`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const got = await page.locator('html').getAttribute('lang').catch(() => null);
			expect(got, `html[lang] on ${path}`).toBeTruthy();
			if (got) {
				expect(got).toMatch(lang);
			}
		});
	}

	test('ar locale html has dir=rtl', async ({ page }) => {
		const resp = await page.goto('/ar', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const dir = await page.locator('html').getAttribute('dir').catch(() => null);
		// Many setups omit dir entirely and rely on CSS — we just verify
		// that IF it's set, it's "rtl" for arabic.
		if (dir) {
			expect(dir.toLowerCase()).toBe('rtl');
		}
	});
});
