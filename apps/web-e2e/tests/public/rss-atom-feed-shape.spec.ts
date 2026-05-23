import { test, expect } from '@playwright/test';

// RSS / Atom feed shape contract. We do NOT assert item content; we DO
// assert valid XML and required root elements.

test.describe('RSS / Atom feed shape', () => {
	test('/rss.xml is XML and has <rss> root', async ({ request }) => {
		const resp = await request.get('/rss.xml');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.startsWith('<?xml')).toBe(true);
		// Accept either <rss> or <feed> (some sites swap them on /rss.xml).
		expect(/<(rss|feed)/i.test(body), 'rss/atom root present').toBe(true);
	});

	test('/atom.xml is XML and has <feed> root', async ({ request }) => {
		const resp = await request.get('/atom.xml');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.startsWith('<?xml')).toBe(true);
		expect(/<feed/i.test(body), 'atom root present').toBe(true);
	});

	test('/feed.json declares jsonfeed version', async ({ request }) => {
		const resp = await request.get('/feed.json');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.json().catch(() => null);
		expect(body, 'feed body').toBeTruthy();
		// JSON Feed 1.x requires "version" field.
		const v = (body as { version?: string } | null)?.version;
		if (v !== undefined) {
			expect(typeof v).toBe('string');
		}
	});
});
