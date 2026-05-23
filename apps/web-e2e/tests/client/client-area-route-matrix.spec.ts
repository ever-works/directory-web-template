import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// Coverage matrix for the entire /client/* surface from the authenticated
// client perspective. Existing per-route specs cover specific behaviors
// (dashboard charts, settings tabs, etc.); this matrix asserts the simpler
// "every page in this section actually loads".

const CLIENT_ROUTES = [
	{ path: '/client/dashboard', name: 'Dashboard' },
	{ path: '/client/settings', name: 'Settings hub' },
	{ path: '/client/settings/profile/basic-info', name: 'Settings: basic info' },
	{ path: '/client/settings/profile/billing', name: 'Settings: profile billing' },
	{ path: '/client/settings/profile/location', name: 'Settings: location' },
	{ path: '/client/settings/profile/portfolio', name: 'Settings: portfolio' },
	{ path: '/client/settings/profile/theme-colors', name: 'Settings: theme colors' },
	{
		path: '/client/settings/profile/submissions/trash',
		name: 'Settings: submissions trash'
	},
	{ path: '/client/settings/security', name: 'Settings: security' },
	{ path: '/client/sponsorships', name: 'Sponsorships' },
	{ path: '/client/submissions', name: 'Submissions' },
	{ path: '/client/submissions/trash', name: 'Submissions trash' },
	{ path: '/client/users', name: 'Users directory' }
];

test.describe('Client surface coverage — authenticated', () => {
	test.use({ storageState: CLIENT_STATE_FILE });
	for (const { path, name } of CLIENT_ROUTES) {
		test(`${name} (${path}) loads`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path} should not 5xx`).toBeLessThan(500);
			expect(page.url()).not.toMatch(/\/auth\/signin/);
			await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
		});
	}
});
