import { test, expect } from '@playwright/test';

// Search query `q=` various shapes — listing endpoint must tolerate all.

const Q_PROBES = [
	'',
	'   ',
	'%20',
	'a',
	'A',
	'ZZ',
	'1',
	'-1',
	'0.0',
	'%',
	'%2520',
	'a b',
	'a+b',
	'a%20b',
	'<>',
	'/',
	'\\',
	'"',
	"'",
	'\n',
	'\t',
	'\\u0000',
	'日本',
	'한국어',
	'русский',
	'😀',
	'a'.repeat(256),
	'a'.repeat(2048)
];

test.describe('Listing /discover/1?q=<shape> tolerance', () => {
	for (const q of Q_PROBES) {
		test(`q=${JSON.stringify(q.slice(0, 24))} non-5xx`, async ({ request }) => {
			const resp = await request.get('/discover/1?q=' + encodeURIComponent(q));
			expect(resp.status()).toBeLessThan(500);
		});
	}
});
