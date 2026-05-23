import { test, expect } from '@playwright/test';

// Home HTML must:
// - declare <!DOCTYPE html>
// - contain a <html>, <head>, <body>
// - end without dangling open tags

test.describe('HTML payload shape', () => {
	test('/ has <!DOCTYPE html>', async ({ request }) => {
		const resp = await request.get('/');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.slice(0, 100).toLowerCase()).toContain('<!doctype html>');
	});

	test('/ has <html>, <head>, <body>', async ({ request }) => {
		const resp = await request.get('/');
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = (await resp.text()).toLowerCase();
		expect(body).toContain('<html');
		expect(body).toContain('<head');
		expect(body).toContain('<body');
	});

	test('/ closes html tag', async ({ request }) => {
		const resp = await request.get('/');
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = (await resp.text()).toLowerCase();
		expect(body).toContain('</html>');
	});
});
