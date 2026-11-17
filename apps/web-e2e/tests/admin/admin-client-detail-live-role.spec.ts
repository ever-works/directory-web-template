import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// /admin/clients/[id] loads the client's profile, last login, portfolio and
// stats on the server. It now checks the live admin role with
// isAdmin(session.user.id) before any of that (T-2637), instead of the
// session's isAdmin claim, which stays for the JWT's 30-day lifetime. A
// signed-in user without the admin role is redirected by the server to
// /unauthorized (it was sent to sign-in before); anonymous visitors still go
// to sign-in (admin-detail-pages-anonymous.spec.ts).

test.describe('Admin client detail page checks the live admin role', () => {
	test.use({ storageState: CLIENT_STATE_FILE });

	test('a signed-in client is redirected to /unauthorized', async ({ page }) => {
		const resp = await page.goto('/admin/clients/non-existent-id-zzz', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await expect(page).toHaveURL(/\/unauthorized/, { timeout: 30_000 });
	});
});
