import { test, expect } from '@playwright/test';

/**
 * Every `<script type="application/ld+json">` block must contain
 * parseable JSON. Invalid JSON-LD is silently ignored by Google but
 * is a strong signal that something is broken in the build pipeline
 * (often un-escaped quote or an interpolated template literal).
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

test.describe('Public HTML: JSON-LD blocks are parseable', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} JSON-LD blocks parse without error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
			for (let i = 0; i < blocks.length; i++) {
				const raw = blocks[i];
				let parsed: unknown = null;
				let parseError: unknown = null;
				try {
					parsed = JSON.parse(raw);
				} catch (err) {
					parseError = err;
				}
				expect(parseError, `JSON-LD block ${i} on ${path}`).toBeNull();
				expect(parsed, `JSON-LD block ${i} on ${path}`).not.toBeNull();
				expect(typeof parsed, `JSON-LD block ${i} on ${path}`).toBe('object');
			}
		});
	}
});
