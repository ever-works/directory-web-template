import { test, expect } from '@playwright/test';

// OPTIONS preflight on admin endpoints from a third-party origin must
// not 5xx and must NOT grant access-control-allow-origin: *.

const PROBES = [
	'/api/admin/items',
	'/api/admin/users',
	'/api/admin/categories'
];

test.describe('Admin OPTIONS preflight from foreign origin', () => {
	for (const path of PROBES) {
		test(`OPTIONS ${path} from foreign origin does not allow * CORS`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method: 'OPTIONS',
				headers: {
					origin: 'https://evil.example.com',
					'access-control-request-method': 'POST',
					'access-control-request-headers': 'content-type'
				}
			});
			expect(resp.status()).toBeLessThan(500);
			const acao = resp.headers()['access-control-allow-origin'];
			if (acao) {
				expect(acao, `${path} admin preflight allowed origin`).not.toBe('*');
				expect(acao).not.toBe('https://evil.example.com');
			}
		});
	}
});
