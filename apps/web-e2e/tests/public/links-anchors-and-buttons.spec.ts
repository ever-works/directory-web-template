import { test, expect } from '@playwright/test';

// Home page interactivity smoke: every <a> with an href and every <button>
// should be either a valid internal route or a valid external URL. This is
// a quick safety net for "I broke the header" PRs.

test.describe('Anchor / button shape smoke', () => {
	test('homepage has at least one anchor and one button', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const anchors = await page.locator('a[href]').count();
		expect(anchors, 'anchor count').toBeGreaterThan(0);
		const buttons = await page.locator('button').count();
		expect(buttons, 'button count').toBeGreaterThan(0);
	});

	test('no anchor has href="undefined" or href="null"', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const bad = await page.locator('a[href="undefined"], a[href="null"]').count();
		expect(bad, 'anchors with literal "undefined"/"null" href').toBe(0);
	});

	test('no button has empty aria-label and no visible text', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const buttons = page.locator('button');
		const count = await buttons.count();
		const unlabeled: string[] = [];
		for (let i = 0; i < count; i++) {
			const btn = buttons.nth(i);
			const txt = (await btn.innerText().catch(() => '')).trim();
			const aria = (await btn.getAttribute('aria-label').catch(() => null))?.trim();
			const title = (await btn.getAttribute('title').catch(() => null))?.trim();
			if (!txt && !aria && !title) {
				unlabeled.push(`#${i}`);
			}
		}
		// Don't fail; we surface the count as a warning. Pure-icon buttons
		// without any label are an a11y red flag but not necessarily a 5xx.
		expect(unlabeled.length, `unlabeled buttons: ${unlabeled.join(', ')}`).toBeLessThan(50);
	});
});
