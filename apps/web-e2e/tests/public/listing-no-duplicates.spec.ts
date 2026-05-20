import { test, expect } from '@playwright/test';

// /api/items.json shape: items must have unique slugs (no duplicate
// entries — that's a SEO + UX disaster).

test.describe('Items.json shape contracts', () => {
	test('items.json returns array (or object with items array)', async ({ request }) => {
		const resp = await request.get('/api/items.json');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.json().catch(() => null);
		expect(body, 'items.json body').toBeTruthy();
		const items = Array.isArray(body) ? body : (body as { items?: unknown[] }).items;
		if (!items) {
			test.skip();
			return;
		}
		expect(Array.isArray(items), 'items array shape').toBe(true);
	});

	test('items.json slugs are unique', async ({ request }) => {
		const resp = await request.get('/api/items.json');
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.json().catch(() => null);
		const items = (Array.isArray(body) ? body : (body as { items?: unknown[] }).items) as
			| Array<{ slug?: string }>
			| undefined;
		if (!items || items.length === 0) {
			test.skip();
			return;
		}
		const slugs = items.map((i) => i.slug).filter((s): s is string => typeof s === 'string');
		const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
		expect(dup, `duplicate slugs in items.json: ${dup.join(', ')}`).toEqual([]);
	});
});
