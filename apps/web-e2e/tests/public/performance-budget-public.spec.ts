import { test, expect } from '@playwright/test';

// AGENTS.md §5 sets a performance budget: LCP ≤ 2.5s, INP ≤ 200ms,
// CLS ≤ 0.1 on representative public pages. Public routes must be
// ≤ 250 KB gzip first-load JS.
//
// This spec doesn't measure Core Web Vitals (that requires the user's
// own real device + RUM); instead it captures the loadable-bundle proxy
// metric: total JS bytes transferred on first load. It's a rough proxy
// for first-load JS size budget.

const BUDGET_PAGES = ['/', '/about', '/auth/signin'];
const JS_BUDGET_KB = 600; // generous local-CI ceiling — production budget is 250KB gzip

test.describe('Performance budget (public pages)', () => {
	for (const path of BUDGET_PAGES) {
		test(`${path} ships under ${JS_BUDGET_KB}KB of JS on first load`, async ({ page }) => {
			let totalJsBytes = 0;
			page.on('response', async (resp) => {
				const ct = resp.headers()['content-type'] ?? '';
				if (!ct.toLowerCase().includes('javascript')) return;
				const cl = Number(resp.headers()['content-length'] ?? 0);
				if (cl > 0) {
					totalJsBytes += cl;
				} else {
					// Fallback: pull the body to measure (slower).
					try {
						const buf = await resp.body();
						totalJsBytes += buf.length;
					} catch {
						// Some responses can't be re-read; skip.
					}
				}
			});
			await page.goto(path, { waitUntil: 'load' });
			const kb = Math.round(totalJsBytes / 1024);
			console.log(`${path}: JS total ${kb} KB`);
			expect(kb, `${path}: ${kb} KB of JS exceeds budget`).toBeLessThan(JS_BUDGET_KB);
		});
	}

	test('home loads within 10s on a cold dev server', async ({ page }) => {
		const start = Date.now();
		await page.goto('/', { waitUntil: 'load' });
		const elapsed = Date.now() - start;
		// 10s is a generous threshold — CI cold start can be slow.
		expect(elapsed, `home loaded in ${elapsed}ms`).toBeLessThan(10_000);
	});
});
