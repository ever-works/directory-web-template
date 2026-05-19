import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

// Admin surface must work in non-default locales too. Catches the class
// of "admin component only ships an `en` translation key" regressions.

const ADMIN_PAGES = ['/admin', '/admin/items', '/admin/users', '/admin/settings'];
const ALT_LOCALES = ['fr', 'es', 'de'] as const;

test.describe('Admin pages in alternate locales', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	for (const locale of ALT_LOCALES) {
		for (const page of ADMIN_PAGES) {
			const url = `/${locale}${page}`;
			test(`${locale.toUpperCase()} ${page} (${url}) loads for admin`, async ({ page: pw }) => {
				const resp = await pw.goto(url, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `${url}`).toBeLessThan(500);
				expect(pw.url()).not.toMatch(/\/auth\/signin/);
				await expect(pw.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
			});
		}
	}
});
