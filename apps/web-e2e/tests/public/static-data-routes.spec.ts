import { test, expect } from '@playwright/test';

// Static data routes (Next.js puts JSON / RSC payloads at predictable
// paths). Probing them at well-known shapes must non-5xx.

const PROBES = [
	'/_next/data/_no_locale/index.json',
	'/_next/data/development/index.json',
	'/_next/static/chunks/main.js',
	'/_next/static/css/app.css'
];

test.describe('Static data probe tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
