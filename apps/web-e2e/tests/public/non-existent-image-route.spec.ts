import { test, expect } from '@playwright/test';

// Probes for image-shaped paths that don't exist — must non-5xx, prefer 404.

const PROBES = [
	'/images/does-not-exist.png',
	'/img/x.png',
	'/assets/x.png',
	'/uploads/x.jpg',
	'/static/x.svg',
	'/public/x.png',
	'/cdn-cgi/image/x.png',
	'/photos/x.webp'
];

test.describe('Non-existent image-shaped paths', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
