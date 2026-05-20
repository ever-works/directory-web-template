import { test, expect } from '@playwright/test';

// Additional /.well-known/* and convention-based discovery probes beyond the
// ones already covered in webfinger-and-well-known.spec.ts. None of these
// should 5xx; serving them or 404'ing them is equally valid.

const EXTRA_WELL_KNOWN = [
	'/.well-known/dnt-policy.txt',
	'/.well-known/gpc.json',
	'/.well-known/mta-sts.txt',
	'/.well-known/time.txt',
	'/.well-known/trust.txt',
	'/.well-known/pki-validation/test.txt',
	'/.well-known/acme-challenge/test',
	'/.well-known/brave-rewards-verification.txt',
];

const CONVENTION_DOCS = [
	'/humans.txt',
	'/ads.txt',
	'/app-ads.txt',
	'/sellers.json',
	'/llms.txt',
	'/llms-full.txt',
];

test.describe('Discovery: extra well-known probes', () => {
	for (const path of EXTRA_WELL_KNOWN) {
		test(`well-known ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});

test.describe('Discovery: convention text/json documents', () => {
	for (const path of CONVENTION_DOCS) {
		test(`convention doc ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
