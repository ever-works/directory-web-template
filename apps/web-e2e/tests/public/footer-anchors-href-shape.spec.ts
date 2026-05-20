import { test, expect } from '@playwright/test';

// All footer anchors should have hrefs in a sane shape:
// - non-empty
// - not "javascript:"-protocol
// - either http(s):// absolute, root-relative, or pure fragment "#…"

test.describe('Footer: anchor href shape integrity', () => {
	test('home footer anchors have safe hrefs', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const footerLinks = page.locator('footer a');
		const count = await footerLinks.count();
		expect(count, 'footer should have some links').toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			const href = await footerLinks.nth(i).getAttribute('href');
			expect(href, `footer link ${i} href`).not.toBeNull();
			expect(href!, `footer link ${i} non-empty`).not.toBe('');
			expect(href!.toLowerCase(), `footer link ${i} no javascript:`).not.toMatch(/^javascript:/);
			expect(href!, `footer link ${i} shape`).toMatch(/^(https?:\/\/|\/|#|mailto:|tel:)/);
		}
	});

	test('discover footer anchors share the same shape rule', async ({ page }) => {
		const response = await page.goto('/discover', { waitUntil: 'domcontentloaded' });
		expect(response!.status()).toBeLessThan(500);

		const footerLinks = page.locator('footer a');
		const count = await footerLinks.count();
		test.skip(count === 0, 'no footer on /discover — skipping');

		for (let i = 0; i < count; i++) {
			const href = await footerLinks.nth(i).getAttribute('href');
			expect(href).not.toBeNull();
			expect(href!.toLowerCase()).not.toMatch(/^javascript:/);
			expect(href!).toMatch(/^(https?:\/\/|\/|#|mailto:|tel:)/);
		}
	});

	test('home footer: no anchor with target="_blank" missing rel=noopener', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const externalBlankLinks = page.locator('footer a[target="_blank"]');
		const count = await externalBlankLinks.count();

		for (let i = 0; i < count; i++) {
			const rel = (await externalBlankLinks.nth(i).getAttribute('rel')) ?? '';
			expect(rel, `footer external link ${i} must have noopener or noreferrer`).toMatch(
				/(noopener|noreferrer)/,
			);
		}
	});
});
