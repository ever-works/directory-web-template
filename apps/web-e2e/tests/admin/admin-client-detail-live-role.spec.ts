import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// /admin/clients/[id] loads the client's profile, last login, portfolio and
// stats on the server. T-2637 made the page check the live admin role with
// isAdmin(session.user.id) before any of that, instead of the session's
// isAdmin claim, which stays for the JWT's 30-day lifetime.
//
// This spec does NOT reach that check. A client's token has isAdmin: false, so
// proxy.ts (nextAuthGuard) sends it to /admin/auth/signin before the page runs,
// and the client-side admin layout then sends it on to /unauthorized. It passes
// on the code before T-2637 too. It only pins the end state for a signed-in
// non-admin. The revoked-role case (claim still true, role removed) is covered
// by apps/web/lib/auth/__tests__/admin-claim-pages.spec.ts. Anonymous visitors:
// admin-detail-pages-anonymous.spec.ts.

test.describe('Admin client detail page for a signed-in non-admin', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	test('a signed-in client ends on /unauthorized', async ({ page }) => {
		const resp = await page.goto('/admin/clients/non-existent-id-zzz', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/\/unauthorized/, { timeout: 30_000 });
	});
});
