import { test, expect } from '@playwright/test';

// /api/items.json + search endpoints should not crash under rapid-fire
// load. Real bots will hit these dozens of times per second. We don't
// require rate-limiting to be in place, but if it IS, the response shape
// should be a clean 429 (not 500).

test.describe('Search / listing rapid-fire tolerance', () => {
	test('20 quick requests to /api/items.json don\'t collectively 5xx', async ({ request }) => {
		test.setTimeout(60_000);
		const results: number[] = [];
		for (let i = 0; i < 20; i++) {
			const r = await request.get('/api/items.json?_=' + i);
			results.push(r.status());
		}
		const overFive = results.filter((s) => s >= 500);
		expect(overFive, `5xx count among 20 rapid requests: ${overFive.length}`).toEqual([]);
	});

	test('parallel /discover/1?q=different searches don\'t 5xx', async ({ request }) => {
		const promises = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((q) =>
			request.get(`/discover/1?q=${q}`)
		);
		const results = await Promise.all(promises);
		const statuses = results.map((r) => r.status());
		const overFive = statuses.filter((s) => s >= 500);
		expect(overFive, `5xx count among parallel: ${overFive.length}`).toEqual([]);
	});
});
