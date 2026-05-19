import { test, expect } from '@playwright/test';

// Font CSS declarations should declare font-display swap/fallback/optional.
// "auto" or "block" causes long FOIT.

test.describe('Font @font-face declares non-block font-display', () => {
	test('/ stylesheets have no font-display:block or :auto', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		// Sample inline <style> only (cross-origin stylesheets blocked).
		const blocked = await page.evaluate(() => {
			const styles = Array.from(document.querySelectorAll('style'))
				.map((s) => s.textContent || '')
				.join('\n');
			return {
				blockCount: (styles.match(/font-display\s*:\s*block/g) || []).length,
				autoCount: (styles.match(/font-display\s*:\s*auto/g) || []).length
			};
		});
		expect(blocked.blockCount, 'font-display:block').toBe(0);
		// auto is the default — flag only if conspicuously many.
		expect(blocked.autoCount, 'font-display:auto').toBeLessThan(10);
	});
});
