import { test, expect } from '@playwright/test';

// Host header spoofing — server may use Host for absolute URL generation.
// Must not 5xx and must not echo spoofed host into Location / canonical.

const FAKE_HOSTS = ['evil.example.com', 'attacker.local', 'fake.test'];

test.describe('Host header spoofing tolerance', () => {
	for (const host of FAKE_HOSTS) {
		test(`GET / with Host=${host} non-5xx`, async ({ request }) => {
			const resp = await request.get('/', { headers: { host } });
			expect(resp.status()).toBeLessThan(500);
			const loc = resp.headers()['location'] || '';
			expect(loc.toLowerCase()).not.toContain(host.toLowerCase());
		});
	}
});
