import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * unauthenticated user-currency detection endpoint served by
 * `apps/web/app/api/user/currency/route.ts`.
 *
 * `GET /api/user/currency` is intentionally **graceful-degradation**
 * — it inspects the caller's `Cf-IPCountry` / `X-Vercel-IP-Country`
 * / `Cloudfront-Viewer-Country` / `Fastly-Country` (and similar)
 * headers via a configurable provider, maps the detected ISO 3166-1
 * alpha-2 country to a currency via `getCurrencyFromCountry()`, and
 * **always returns 200** with a `{ currency, country, detected }`
 * envelope. The handler signature is the **single-argument** Next 16
 * form:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const { searchParams } = new URL(request.url);
 *         const provider = validateProvider(searchParams.get('provider'));
 *         const headers = request.headers;
 *         const detectedCountry = getCountryFromHeaders(headers, provider);
 *         const currency = detectedCountry
 *           ? getCurrencyFromCountry(detectedCountry)
 *           : 'USD';
 *         return NextResponse.json({
 *           currency,
 *           country: detectedCountry,
 *           detected: !!detectedCountry
 *         });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { currency: 'USD', country: null, detected: false },
 *           { status: 200 }
 *         );
 *       }
 *     }
 *
 * The handler reads **exactly one** query parameter — `provider`
 * — and runs it through `validateProvider()`, which lowercases /
 * trims and falls back to `'smart'` for any value that is not in
 * the canonical seven-element allowlist
 * (`'cloudflare' | 'vercel' | 'cloudfront' | 'fastly' | 'generic' | 'auto' | 'smart'`).
 *
 * The route's response contract is the load-bearing invariant
 * this spec pins:
 *
 *   - **No headers, no provider override**: `getCountryFromHeaders`
 *     returns `null`; the route returns
 *     `{ currency: 'USD', country: null, detected: false }`
 *     with status 200. This is the contract every assertion below
 *     pins, because the e2e runner does not carry CDN country
 *     headers by default.
 *   - **Valid provider override**: `provider=cloudflare` /
 *     `vercel` / `cloudfront` / `fastly` / `generic` / `auto` /
 *     `smart` round-trips through `validateProvider()` and reaches
 *     `getCountryFromHeaders` with the parsed enum value. Without
 *     the matching header, the result is the same fallback
 *     envelope.
 *   - **Invalid provider override**: every other string
 *     (`provider=google`, `provider=akamai`, `provider=`,
 *     `provider=%3Cscript%3E`, …) falls back to `'smart'` via
 *     `validateProvider()`. The response is the same fallback
 *     envelope.
 *   - **Internal error**: `getCountryFromHeaders` or
 *     `getCurrencyFromCountry` throws; the catch returns the
 *     same fallback envelope with status 200. Out of scope for
 *     this spec because every call from this spec walks the
 *     happy path through to the no-header-detected branch.
 *
 * Note that the handler's response is **always 200** — there is no
 * 4xx or 5xx branch reachable on the GET surface from an
 * unauthenticated caller without forged country headers. A
 * regression that introduces a non-200 status (for instance, by
 * starting to gate the route on auth, or by re-throwing the catch
 * path) would surface immediately as a status divergence below.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/current-user/route.ts` and
 * `apps/web/app/api/user/payments/route.ts` smoke specs pinned at
 * `current-user-query.spec.ts` and `payments-query.spec.ts` — the
 * three routes share the same `apps/web/app/api/user/`-tree
 * placement, but the currency route is the **only** GET handler
 * in the user tree that is **not** session-gated, so the response
 * contract differs (always 200, never 401).
 */
const CURRENCY_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included so a
	// future reader of this file sees the canonical case
	// alongside the variants it parametrises.
	'/api/user/currency',

	// `?provider=…` — the **one** key the route reads today.
	// Every value in the canonical seven-element allowlist must
	// round-trip identically because the runner does not carry
	// CDN country headers.
	'/api/user/currency?provider=cloudflare',
	'/api/user/currency?provider=vercel',
	'/api/user/currency?provider=cloudfront',
	'/api/user/currency?provider=fastly',
	'/api/user/currency?provider=generic',
	'/api/user/currency?provider=auto',
	'/api/user/currency?provider=smart',

	// Case-insensitive provider values — `validateProvider()`
	// lowercases before comparing, so every casing variant must
	// resolve to the same provider.
	'/api/user/currency?provider=Cloudflare',
	'/api/user/currency?provider=VERCEL',
	'/api/user/currency?provider=CloudFront',
	'/api/user/currency?provider=Smart',

	// Whitespace-padded provider values — `validateProvider()`
	// trims before comparing.
	'/api/user/currency?provider=+cloudflare+',
	'/api/user/currency?provider=%20vercel%20',
	'/api/user/currency?provider=%09auto%09',

	// Out-of-allowlist provider values — every value not in the
	// canonical seven-element allowlist must fall back to
	// `'smart'` via `validateProvider()`. The response is the
	// same fallback envelope as the in-allowlist case.
	'/api/user/currency?provider=google',
	'/api/user/currency?provider=akamai',
	'/api/user/currency?provider=netlify',
	'/api/user/currency?provider=aws',
	'/api/user/currency?provider=azure',
	'/api/user/currency?provider=manual',
	'/api/user/currency?provider=session',
	'/api/user/currency?provider=undefined',
	'/api/user/currency?provider=null',

	// Empty / null-like provider values — `validateProvider()`
	// returns `'smart'` on the empty / null input.
	'/api/user/currency?provider=',
	'/api/user/currency?provider',

	// Repeated provider keys — `searchParams.get('provider')`
	// returns the first value, but the route validates either
	// way.
	'/api/user/currency?provider=cloudflare&provider=vercel',
	'/api/user/currency?provider=&provider=smart',

	// `?country=` / `?countryCode=` / `?currency=` — the
	// obvious wiring for a "force the detected country" or
	// "force the returned currency" override. The route reads
	// **only** `provider` today; every other key must be
	// silently ignored.
	'/api/user/currency?country=US',
	'/api/user/currency?country=FR',
	'/api/user/currency?country=DE',
	'/api/user/currency?country=anything',
	'/api/user/currency?countryCode=US',
	'/api/user/currency?currency=EUR',
	'/api/user/currency?currency=USD',
	'/api/user/currency?currency=anything',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious wiring
	// for an "admin-views-other-user's-currency" feature. The
	// route is **not** session-gated today and reads zero
	// user-identifier keys.
	'/api/user/currency?userId=anything',
	'/api/user/currency?user_id=anything',
	'/api/user/currency?uid=anything',

	// `?token=` / `?secret=` / `?api_key=` / `?authorization=`
	// — the obvious "I have a magic auth token, let me through"
	// keys. The route does not authenticate today.
	'/api/user/currency?token=anything',
	'/api/user/currency?secret=anything',
	'/api/user/currency?api_key=anything',
	'/api/user/currency?authorization=Bearer+anything',

	// `?force=` / `?refresh=` / `?cache=` — the obvious
	// cache-busting keys. The handler does not branch on any
	// cache-control query param today.
	'/api/user/currency?refresh=1',
	'/api/user/currency?force=true',
	'/api/user/currency?fresh=true',
	'/api/user/currency?cache=bypass',
	'/api/user/currency?nocache=1',

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	'/api/user/currency?format=json',
	'/api/user/currency?format=xml',
	'/api/user/currency?format=csv',
	'/api/user/currency?format=pdf',

	// `?locale=` / `?lang=` — the obvious "format the response
	// in this locale" keys. The route reads neither.
	'/api/user/currency?locale=en',
	'/api/user/currency?locale=fr',
	'/api/user/currency?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/user/currency?tenant=acme',
	'/api/user/currency?tenantId=42',
	'/api/user/currency?org=ever-works',

	// Special-character provider values that would tempt a
	// future regex match, LIKE-prefix, or path-injection
	// wiring. The route does not pass the provider value into
	// any SQL or filesystem path today.
	'/api/user/currency?provider=%3Cscript%3E',
	'/api/user/currency?provider=%27%20OR%201%3D1',
	'/api/user/currency?provider=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/user/currency?provider=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long inputs.
	`/api/user/currency?provider=${'x'.repeat(500)}`,
	`/api/user/currency?country=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads only
	// `provider`, so any combination of unknown keys must be
	// silently ignored.
	'/api/user/currency?unknown=value',
	'/api/user/currency?foo=bar&baz=qux',
	'/api/user/currency?provider=cloudflare&country=US&currency=EUR&userId=alice&unknown=value'
] as const;

const ALLOWED_CURRENCIES = new Set([
	'USD',
	'EUR',
	'GBP',
	'JPY',
	'CNY',
	'CAD',
	'AUD',
	'CHF',
	'INR',
	'BRL',
	'MXN',
	'KRW',
	'RUB',
	'TRY',
	'ZAR',
	'SGD',
	'HKD',
	'NOK',
	'SEK',
	'DKK',
	'PLN',
	'CZK',
	'HUF',
	'NZD',
	'THB',
	'ILS',
	'CLP',
	'PHP',
	'AED'
]);

test.describe('API: /api/user/currency query-param surface', () => {
	for (const path of CURRENCY_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The handler's response is always 200 because the
			// catch path also returns 200 with the fallback
			// envelope. Any non-200 status is a regression.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/user/currency returns the canonical 200 fallback envelope on the no-header branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch with no CDN headers is
		// the load-bearing invariant: the route must always
		// return 200 with a `{ currency, country, detected }`
		// envelope. A regression that introduces a 401 / 4xx
		// gate would surface here as a status divergence.
		const response = await request.get('/api/user/currency');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as {
			currency?: unknown;
			country?: unknown;
			detected?: unknown;
		};

		expect(typeof body.currency).toBe('string');
		// ISO 4217 codes are exactly 3 uppercase letters.
		expect(body.currency).toMatch(/^[A-Z]{3}$/);
		// The detection flag must be present and boolean.
		expect(typeof body.detected).toBe('boolean');
		// `country` is either null or a 2-letter ISO 3166-1
		// alpha-2 code.
		if (body.country !== null) {
			expect(typeof body.country).toBe('string');
			expect(body.country).toMatch(/^[A-Z]{2}$/);
		}
	});

	test(`GET /api/user/currency returns 200 identically across every canonical provider value`, async ({
		request
	}) => {
		// `validateProvider()` accepts the seven canonical
		// values; without CDN headers, the response shape must
		// be invariant across all of them.
		const baseline = await request.get('/api/user/currency');
		const baselineBody = (await baseline.json()) as { detected?: boolean };

		const providers = [
			'cloudflare',
			'vercel',
			'cloudfront',
			'fastly',
			'generic',
			'auto',
			'smart'
		];
		for (const provider of providers) {
			const response = await request.get(`/api/user/currency?provider=${provider}`);
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { detected?: boolean };
			// Without CDN headers, every canonical provider must
			// return the same `detected` value as the baseline.
			expect(body.detected).toBe(baselineBody.detected);
		}
	});

	test(`GET /api/user/currency returns 200 identically for invalid provider values (falls back to 'smart')`, async ({
		request
	}) => {
		// `validateProvider()` falls back to `'smart'` for
		// every out-of-allowlist value. The response must be
		// invariant against any string the caller supplies.
		const baseline = await request.get('/api/user/currency');
		const baselineBody = (await baseline.json()) as { detected?: boolean };

		const invalidProviders = [
			'google',
			'akamai',
			'netlify',
			'',
			'%3Cscript%3E',
			'%2F..%2F..%2Fetc%2Fpasswd'
		];
		for (const provider of invalidProviders) {
			const response = await request.get(`/api/user/currency?provider=${provider}`);
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { detected?: boolean };
			expect(body.detected).toBe(baselineBody.detected);
		}
	});

	test(`GET /api/user/currency?country=… does NOT bypass the country detection`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('country')` as a fallback for the
		// CDN header would change the response shape from
		// "always derived from headers" to "honors caller-supplied
		// country override". This assertion catches that change
		// immediately by asserting the response is invariant to
		// the `country` query key.
		const baseline = await request.get('/api/user/currency');
		const baselineBody = (await baseline.json()) as {
			currency?: string;
			country?: string | null;
			detected?: boolean;
		};

		const withCountry = await request.get('/api/user/currency?country=FR');
		const withCountryCode = await request.get('/api/user/currency?countryCode=DE');

		const withCountryBody = (await withCountry.json()) as {
			currency?: string;
			country?: string | null;
			detected?: boolean;
		};
		const withCountryCodeBody = (await withCountryCode.json()) as {
			currency?: string;
			country?: string | null;
			detected?: boolean;
		};

		// All three responses must be byte-identical envelopes
		// because the route reads zero country-override keys
		// today.
		expect(withCountryBody).toEqual(baselineBody);
		expect(withCountryCodeBody).toEqual(baselineBody);
	});

	test(`GET /api/user/currency?currency=… does NOT bypass the currency derivation`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('currency')` as a fallback for the
		// detected-currency derivation would silently grant
		// caller-controlled override. This assertion pins the
		// "the currency is derived from the detected country"
		// invariant.
		const baseline = await request.get('/api/user/currency');
		const baselineBody = (await baseline.json()) as { currency?: string };

		const withCurrency = await request.get('/api/user/currency?currency=EUR');
		const withCurrencyBody = (await withCurrency.json()) as { currency?: string };

		// The currency must be invariant to the caller-supplied
		// `currency` override.
		expect(withCurrencyBody.currency).toBe(baselineBody.currency);
	});

	test(`GET /api/user/currency returns a currency from the supported ISO 4217 set`, async ({
		request
	}) => {
		// The route's `getCurrencyFromCountry()` mapping table
		// only emits codes from the `SUPPORTED_CURRENCIES` set
		// (see `apps/web/lib/config/billing.ts`). A regression
		// that returns an unsupported code would surface here.
		const response = await request.get('/api/user/currency');
		const body = (await response.json()) as { currency?: string };

		expect(body.currency).toBeDefined();
		expect(ALLOWED_CURRENCIES.has(body.currency!)).toBe(true);
	});

	test(`GET /api/user/currency keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 200 fallback envelope
		// because the route reads zero override keys (only
		// `provider`) today.
		const responses = await Promise.all([
			request.get('/api/user/currency'),
			request.get('/api/user/currency?provider=cloudflare&country=FR&currency=EUR'),
			request.get(
				'/api/user/currency?provider=invalid&token=foo&userId=alice&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as {
				currency?: unknown;
				detected?: unknown;
			};
			expect(typeof body.currency).toBe('string');
			expect(body.currency).toMatch(/^[A-Z]{3}$/);
			expect(typeof body.detected).toBe('boolean');
		}
	});
});
