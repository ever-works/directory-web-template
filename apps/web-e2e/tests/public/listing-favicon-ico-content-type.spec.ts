import { test, expect } from '@playwright/test';

// /favicon.ico must have an image content-type if it 200s.

test.describe('Favicon ICO content-type', () => {
	test('/favicon.ico is image/* when 200', async ({ request }) => {
		const resp = await request.get('/favicon.ico');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() !== 200) test.skip();
		const ct = (resp.headers()['content-type'] || '').toLowerCase();
		expect(ct).toMatch(/(image\/x-icon|image\/vnd\.microsoft\.icon|image\/png|image\/svg)/);
	});
});
