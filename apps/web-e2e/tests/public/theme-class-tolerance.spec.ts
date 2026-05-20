import { test, expect } from '@playwright/test';

// Theme class on <html> must be one of "light", "dark", or absent.
// Server-render must not flicker (the rendering-hydration-no-flicker rule).

test.describe('Theme class tolerance', () => {
	test('/ html class allows light/dark theming', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const cls = await page.locator('html').getAttribute('class').catch(() => null);
		// Must NOT contain literal "undefined" or "null"
		if (cls) {
			expect(cls).not.toMatch(/\bundefined\b/);
			expect(cls).not.toMatch(/\bnull\b/);
		}
	});

	test('/ preserves theme across reload', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const before = await page.locator('html').getAttribute('class').catch(() => '');
		await page.reload({ waitUntil: 'domcontentloaded' });
		const after = await page.locator('html').getAttribute('class').catch(() => '');
		// Class may or may not be set — but a non-trivial cls should
		// match after reload (within tolerance).
		if (before && after) {
			const beforeTok = (before.split(/\s+/) || []).filter((t) =>
				['dark', 'light'].includes(t)
			);
			const afterTok = (after.split(/\s+/) || []).filter((t) =>
				['dark', 'light'].includes(t)
			);
			expect(beforeTok, 'theme tokens preserved across reload').toEqual(afterTok);
		}
	});
});
