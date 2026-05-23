import { test, expect } from '@playwright/test';

// Repeating the same listing request should produce same status. We
// assert non-5xx for 5 sequential calls.

test.describe('Listing repeat stability', () => {
	test('/discover/1 stable across 5 sequential GETs', async ({ request }) => {
		test.setTimeout(60_000);
		const statuses: number[] = [];
		for (let i = 0; i < 5; i++) {
			const r = await request.get('/discover/1');
			statuses.push(r.status());
		}
		const over5 = statuses.filter((s) => s >= 500);
		expect(over5, `5xx during sequential listing: ${over5.length}`).toEqual([]);
	});

	test('/api/items.json stable across 5 sequential GETs', async ({ request }) => {
		const statuses: number[] = [];
		for (let i = 0; i < 5; i++) {
			const r = await request.get('/api/items.json');
			statuses.push(r.status());
		}
		const over5 = statuses.filter((s) => s >= 500);
		expect(over5, `5xx during sequential items.json: ${over5.length}`).toEqual([]);
	});
});
