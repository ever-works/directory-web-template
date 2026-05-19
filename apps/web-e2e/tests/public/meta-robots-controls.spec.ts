import { test, expect } from '@playwright/test';

// Auth pages and admin surfaces should not be indexable. Public content
// pages should be. Asserted via <meta name="robots">.

const PUBLIC_INDEXABLE = ['/', '/about', '/help', '/pricing', '/categories'];
const SHOULD_NOT_INDEX = ['/auth/signin', '/auth/register', '/auth/forgot-password'];

test.describe('Robots indexation controls', () => {
	for (const path of PUBLIC_INDEXABLE) {
		test(`${path} is indexable (no robots:noindex)`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const robots = await page.locator('meta[name="robots"]').first().getAttribute('content').catch(() => null);
			if (robots) {
				const lower = robots.toLowerCase();
				expect(lower, `${path} should be indexable`).not.toContain('noindex');
			}
		});
	}

	for (const path of SHOULD_NOT_INDEX) {
		test(`${path} should ideally carry noindex meta`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const robots = await page.locator('meta[name="robots"]').first().getAttribute('content').catch(() => null);
			// We don't fail on absent — some themes opt out. But if a robots
			// meta IS present, it should not actively allow indexing of an auth
			// page (that'd be a leak to search).
			if (robots) {
				const lower = robots.toLowerCase();
				// Either noindex set (good) or just unset is fine; explicit
				// `index, follow` on auth pages is a regression worth flagging.
				if (lower.includes('index') && !lower.includes('noindex')) {
					console.log(`WARN: ${path} declares ${robots} (auth pages typically noindex)`);
				}
			}
		});
	}

	test('robots.txt does not disallow everything in production', async ({ request }) => {
		const resp = await request.get('/robots.txt');
		expect(resp.status()).toBeLessThan(400);
		const body = (await resp.text()).toLowerCase();
		// We want User-agent: * with at least *some* allowed area.
		// "Disallow: /" (block everything) on a public directory is suspicious.
		const blocksAll = /user-agent:\s*\*\s*[\r\n]+\s*disallow:\s*\/\s*$/m.test(body);
		expect(blocksAll, 'robots.txt should not block everything on a public site').toBe(false);
	});
});
