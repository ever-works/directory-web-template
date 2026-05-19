import { test, expect } from '@playwright/test';

// Anchor content shouldn't show "{" / "}" / template placeholders.

const PROBES = ['/', '/about', '/discover/1', '/categories', '/tags'];

const PLACEHOLDER_PATTERNS = [/\{\{[^}]*\}\}/, /\$\{[^}]*\}/];

test.describe('Anchor text has no unresolved template placeholders', () => {
	for (const path of PROBES) {
		test(`${path} no {{...}} or \${...} in anchors`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate((patterns) => {
				const out: string[] = [];
				const re = patterns.map((p) => new RegExp(p, ''));
				for (const a of Array.from(document.querySelectorAll('a'))) {
					const txt = a.textContent || '';
					for (const r of re) {
						if (r.test(txt)) out.push(txt.slice(0, 60));
					}
				}
				return out;
			}, PLACEHOLDER_PATTERNS.map((r) => r.source));
			expect(bad, `${path} placeholder anchors: ${bad.join(' | ')}`).toEqual([]);
		});
	}
});
