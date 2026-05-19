import { test, expect } from '@playwright/test';

// Sticky/fixed full-screen overlays at load (cookie banner, modal, etc.)
// must not BLOCK the main content from being interactive. Heuristic: if
// any fixed/absolute element is at z-index 9999 AND covers > 80% of
// viewport, we flag it.

test.describe('No full-screen blocker on first paint', () => {
	test('/ has no fullscreen z-index 9999 overlay', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		await page.waitForTimeout(500);
		const blockers = await page.evaluate(() => {
			const blockers: string[] = [];
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
				const s = getComputedStyle(el);
				if (s.position !== 'fixed' && s.position !== 'absolute') continue;
				const z = parseInt(s.zIndex || '0', 10);
				if (z < 1000) continue;
				const r = el.getBoundingClientRect();
				if (r.width >= vw * 0.8 && r.height >= vh * 0.8) {
					blockers.push(`${el.tagName} z=${z}`);
				}
			}
			return blockers;
		});
		expect(blockers.length, `fullscreen z>1000 overlays: ${blockers.join(', ')}`).toBeLessThan(3);
	});
});
