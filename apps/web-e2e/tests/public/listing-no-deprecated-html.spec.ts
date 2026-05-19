import { test, expect } from '@playwright/test';

// HTML produced by the framework should not use deprecated tags.

const DEPRECATED = ['<font', '<center', '<marquee', '<blink', '<applet', '<basefont'];

const PROBES = ['/', '/about', '/discover/1'];

test.describe('No deprecated HTML tags', () => {
	for (const path of PROBES) {
		test(`${path} no deprecated tags`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const body = (await resp.text()).toLowerCase();
			for (const tag of DEPRECATED) {
				expect(body.includes(tag), `${path} contains ${tag}`).toBe(false);
			}
		});
	}
});
