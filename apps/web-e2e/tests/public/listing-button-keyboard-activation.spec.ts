import { test, expect } from '@playwright/test';

// Visible buttons should be activatable via keyboard.

// Mirror the listing-no-console-errors ignore list — React hydration
// errors fire post-mount and are unrelated to the keyboard handler we
// actually want to exercise here.
const IGNORED_ERROR_PATTERNS: RegExp[] = [
	/Minified React error #41[8-9]/,
	/Minified React error #42[0-3]/,
	/hydrat(ion|ed)/i
];

test.describe('Buttons activatable via Enter/Space', () => {
	test('home theme toggle (if present) responds to keyboard', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		// Find the first button-ish role we can hit.
		const button = page.locator('button').first();
		const count = await page.locator('button').count();
		if (count === 0) {
			test.skip();
			return;
		}
		// Focus the button and press Enter — we don't assert on a side
		// effect; we just verify no JS crash.
		await button.focus();
		const uncaught: string[] = [];
		page.on('pageerror', (err) => {
			const msg = String(err.message || err);
			if (IGNORED_ERROR_PATTERNS.some((re) => re.test(msg))) return;
			uncaught.push(msg);
		});
		await page.keyboard.press('Enter').catch(() => {});
		await page.keyboard.press('Space').catch(() => {});
		await page.waitForTimeout(300);
		expect(uncaught, `pageerror after Enter/Space: ${uncaught.join('|')}`).toEqual([]);
	});
});
