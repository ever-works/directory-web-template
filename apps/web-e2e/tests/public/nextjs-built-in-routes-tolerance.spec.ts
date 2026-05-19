import { test, expect } from '@playwright/test';

// Next.js built-in routes that should non-5xx.

const PROBES = [
	'/_next/static/chunks/main.js',
	'/_next/static/chunks/webpack.js',
	'/_next/data/development/manifest.json',
	'/_next/image/?url=/&w=64&q=75',
	'/_next/static/css/app.css',
	'/_next/static/development/_buildManifest.js',
	'/_next/static/development/_ssgManifest.js',
	'/_next/static/media/favicon.ico',
	'/__nextjs_original-stack-frame',
	'/__nextjs_launch-editor'
];

test.describe('Next.js framework routes tolerance', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
