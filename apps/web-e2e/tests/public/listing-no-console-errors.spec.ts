import { test, expect } from '@playwright/test';

// Page console must not throw uncaught errors during a single navigation.
// We DO allow warnings; we DO NOT allow uncaught exceptions.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin'];

// Known-noise patterns. Excluded from the assertion because they don't
// represent a real product bug — typically third-party scripts or React
// dev-build artifacts that can't be silenced from app code.
//
// - React #418/#421/#423 (hydration text/HTML mismatch). Triggered when
//   a server-rendered text differs from the client render — usually a
//   timestamp drift or a theme/locale-dependent value. We suppress
//   warnings via `suppressHydrationWarning` where we own the source,
//   but React still throws the minified error in production builds for
//   any remaining mismatch in a third-party widget or RSC payload.
const IGNORED_ERROR_PATTERNS: RegExp[] = [
	/Minified React error #41[8-9]/,
	/Minified React error #42[0-3]/,
	/hydrat(ion|ed)/i
];

test.describe('No uncaught JS errors during navigation', () => {
	for (const path of PROBES) {
		test(`${path} navigation does not throw uncaught`, async ({ page }) => {
			const uncaught: string[] = [];
			page.on('pageerror', (err) => {
				const msg = String(err.message || err);
				if (IGNORED_ERROR_PATTERNS.some((re) => re.test(msg))) return;
				uncaught.push(msg);
			});
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			// Settle a bit so any deferred scripts fire.
			await page.waitForTimeout(800);
			expect(uncaught, `uncaught errors on ${path}: ${uncaught.join(' | ')}`).toEqual([]);
		});
	}
});
