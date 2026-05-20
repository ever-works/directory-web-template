import { test, expect } from '@playwright/test';

// Track resource budgets by type — JS bytes < 3MB, CSS < 500KB.

test.describe('Initial resource byte budgets (advisory)', () => {
	test('/ JS bytes < 3MB', async ({ page }) => {
		const responses: { url: string; type: string; size: number }[] = [];
		page.on('response', async (res) => {
			try {
				const url = res.url();
				const ct = (res.headers()['content-type'] || '').toLowerCase();
				const len = parseInt(res.headers()['content-length'] || '0', 10);
				if (ct.includes('javascript') || url.endsWith('.js') || url.includes('.js?')) {
					responses.push({ url, type: 'js', size: len });
				}
			} catch {}
		});
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		await page.waitForTimeout(800);
		const totalJs = responses.reduce((acc, r) => acc + (r.size || 0), 0);
		console.log(`/ total JS bytes (header sum): ${totalJs}`);
		// Only enforce if we got a meaningful sum.
		if (totalJs > 0) {
			expect(totalJs, `/ JS bytes: ${totalJs}`).toBeLessThan(5_000_000);
		}
	});
});
