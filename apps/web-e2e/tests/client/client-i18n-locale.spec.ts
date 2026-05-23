import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// Client surface in non-default locales. Spec 027's bug was English-only;
// non-English versions of the same routes can mask different regressions.

const CLIENT_PAGES = [
	'/client/dashboard',
	'/client/settings',
	'/client/submissions',
	'/client/sponsorships'
];
const ALT_LOCALES = ['fr', 'es', 'de'] as const;

test.describe('Client pages in alternate locales', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	for (const locale of ALT_LOCALES) {
		for (const page of CLIENT_PAGES) {
			const url = `/${locale}${page}`;
			test(`${locale.toUpperCase()} ${page} (${url}) loads for client`, async ({ page: pw }) => {
				const resp = await pw.goto(url, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `${url}`).toBeLessThan(500);
				expect(pw.url()).not.toMatch(/\/auth\/signin/);
			});
		}
	}
});
