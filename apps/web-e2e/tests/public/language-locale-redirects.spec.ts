import { test, expect } from '@playwright/test';

// next-intl with localePrefix='as-needed': default-locale routes don't
// have a prefix. /en/<path> may 308 to /<path>. /<unknown-locale>/<path>
// must be 404 (not 200, not 5xx).

const LOCALE_PROBES = [
	{ path: '/en', expectNon5xx: true },
	{ path: '/fr', expectNon5xx: true },
	{ path: '/es', expectNon5xx: true },
	{ path: '/de', expectNon5xx: true },
	{ path: '/ar', expectNon5xx: true },
	{ path: '/zh', expectNon5xx: true },
	{ path: '/en/about', expectNon5xx: true },
	{ path: '/fr/about', expectNon5xx: true },
	{ path: '/xx', expectNon5xx: true }, // unknown locale
	{ path: '/notalocale/about', expectNon5xx: true }
];

test.describe('Locale redirect tolerance', () => {
	for (const { path } of LOCALE_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { maxRedirects: 5 });
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
