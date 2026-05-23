import { test, expect } from '@playwright/test';

// /api/reference query shapes + non-GET verbs.

const PROBES = [
	'/api/reference',
	'/api/reference?type=category',
	'/api/reference?type=tag',
	'/api/reference?type=collection',
	'/api/reference?type=invalid',
	'/api/reference?slug=sample',
	'/api/reference?limit=10',
	'/api/reference?limit=-1'
];

test.describe('Reference query tolerance', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}

	test('POST /api/reference (read-only) non-5xx', async ({ request }) => {
		const resp = await request.post('/api/reference', { data: {} });
		expect(resp.status()).toBeLessThan(500);
	});

	test('DELETE /api/reference non-5xx', async ({ request }) => {
		const resp = await request.delete('/api/reference');
		expect(resp.status()).toBeLessThan(500);
	});
});
