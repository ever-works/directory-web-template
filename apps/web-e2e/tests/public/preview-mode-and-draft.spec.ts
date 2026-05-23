import { test, expect } from '@playwright/test';

// Draft-mode endpoints (if present) must NOT be enable-able anonymously.
// /api/preview is the Pages-router shape — App Router uses /api/draft.
// Anonymous probes must non-5xx and not return a preview-mode cookie.

const PROBES = [
	'/api/preview?secret=x',
	'/api/preview',
	'/api/draft?secret=x',
	'/api/draft',
	'/api/draft/disable',
	'/api/exit-preview',
	'/api/revalidate?secret=x',
	'/api/revalidate'
];

test.describe('Preview / draft / revalidate anonymous probes', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`POST ${path} non-5xx`, async ({ request }) => {
			const resp = await request.post(path);
			expect(resp.status(), `POST ${path}`).toBeLessThan(500);
		});
	}
});
