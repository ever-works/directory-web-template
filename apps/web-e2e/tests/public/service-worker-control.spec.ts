import { test, expect } from '@playwright/test';

// Service worker file (if served) must be JavaScript content-type.

test.describe('Service worker shape', () => {
	test('/sw.js when 200 is JavaScript content-type', async ({ request }) => {
		const resp = await request.get('/sw.js');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() !== 200) test.skip();
		const ct = (resp.headers()['content-type'] || '').toLowerCase();
		expect(ct).toMatch(/javascript|ecmascript/);
	});

	test('/service-worker.js when 200 is JavaScript content-type', async ({ request }) => {
		const resp = await request.get('/service-worker.js');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() !== 200) test.skip();
		const ct = (resp.headers()['content-type'] || '').toLowerCase();
		expect(ct).toMatch(/javascript|ecmascript/);
	});
});
