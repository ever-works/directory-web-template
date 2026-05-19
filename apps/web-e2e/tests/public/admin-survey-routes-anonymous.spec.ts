import { test, expect } from '@playwright/test';

// /admin/surveys/[slug]/{edit,preview,responses} — anonymous probe must
// bounce to /admin/auth/signin (NextAuth pages.signIn target for admin).

const SURVEY_ADMIN_PROBES = [
	'/admin/surveys/create',
	'/admin/surveys/sample/edit',
	'/admin/surveys/sample/preview',
	'/admin/surveys/sample/responses',
	'/admin/surveys/does-not-exist/edit',
	'/admin/surveys/does-not-exist/preview',
	'/admin/surveys/does-not-exist/responses'
];

test.describe('Admin survey routes anonymous gate', () => {
	for (const path of SURVEY_ADMIN_PROBES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Admin pages send to /admin/auth/signin via pages.signIn.
			expect(page.url()).toMatch(/(auth\/signin|admin\/auth|\/$)/);
		});
	}
});
