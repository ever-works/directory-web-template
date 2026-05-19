import { test, expect } from '@playwright/test';

// /.well-known/* endpoints — common probes from federated apps and SSL
// validators. Must not 5xx. If we don't serve them, 404 is correct.

const WELL_KNOWN_PROBES = [
	'/.well-known/security.txt',
	'/.well-known/change-password',
	'/.well-known/host-meta',
	'/.well-known/webfinger',
	'/.well-known/nodeinfo',
	'/.well-known/openid-configuration',
	'/.well-known/jwks.json',
	'/.well-known/assetlinks.json',
	'/.well-known/apple-app-site-association'
];

test.describe('Well-known probes', () => {
	for (const path of WELL_KNOWN_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
