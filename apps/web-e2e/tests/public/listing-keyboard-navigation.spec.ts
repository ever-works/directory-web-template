import { test, expect } from '@playwright/test';

// Keyboard-only navigation: Tab should reach the first link.

test.describe('Keyboard-only navigation reaches links', () => {
	test('Tab on / focuses an interactive element', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		// Tab several times — at least one should land on an anchor/button.
		const landed: string[] = [];
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press('Tab');
			const tag = await page.evaluate(() => {
				const el = document.activeElement;
				return el ? el.tagName.toLowerCase() : null;
			});
			if (tag) landed.push(tag);
		}
		const interactive = landed.filter((t) => ['a', 'button', 'input', 'select', 'textarea'].includes(t));
		expect(interactive.length, `keyboard landed on: ${landed.join(',')}`).toBeGreaterThan(0);
	});

	test('Tab on /auth/signin focuses email/password input', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		// The header on /auth/signin has many anchors + buttons (logo,
		// locale switcher, theme toggle, settings, etc.) before reaching
		// the form. Tab up to 25 times so the test is robust to header
		// expansion without becoming a brittle exact-count assertion.
		const landed: string[] = [];
		for (let i = 0; i < 25; i++) {
			await page.keyboard.press('Tab');
			const tag = await page.evaluate(() => {
				const el = document.activeElement;
				const t = el ? el.tagName.toLowerCase() : '';
				const type = el && 'type' in el ? (el as HTMLInputElement).type : '';
				return `${t}/${type}`;
			});
			if (tag) landed.push(tag);
			// Early-exit once we've reached an input — keep the test fast.
			if (tag.startsWith('input/')) break;
		}
		const inputCount = landed.filter((t) => t.startsWith('input/')).length;
		expect(inputCount, `Tab landed: ${landed.join(',')}`).toBeGreaterThan(0);
	});
});
