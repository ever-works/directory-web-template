import { test, expect } from '@playwright/test';

// /_next/image is the on-the-fly image optimizer. Hostile inputs must
// return 4xx, never 5xx.

const IMG_PROBES = [
	'/_next/image?url=&w=64&q=75',
	'/_next/image?url=/favicon.ico&w=64&q=75',
	'/_next/image?url=http://evil.example.com/x.png&w=64&q=75',
	'/_next/image?url=/favicon.ico&w=99999&q=75',
	'/_next/image?url=/favicon.ico&w=64&q=999',
	'/_next/image?url=/favicon.ico',
	'/_next/image'
];

test.describe('Next.js image optimizer tolerance', () => {
	for (const path of IMG_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
