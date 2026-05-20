import { test, expect } from '@playwright/test';

// Sanity budget: home page must not fire >300 network requests at first
// paint. Catches "image bombs" or runaway prefetches.

test.describe('Network request count budget', () => {
	test('/ fires fewer than 300 requests on first paint', async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (req) => requests.push(req.url()));
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		// Settle 1s for deferred scripts.
		await page.waitForTimeout(1000);
		console.log(`/ network request count: ${requests.length}`);
		expect(requests.length).toBeLessThan(300);
	});
});
