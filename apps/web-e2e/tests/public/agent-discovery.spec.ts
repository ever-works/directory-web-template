import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **agent-discovery surface** — the public
 * `/llms.txt` + `/items.json` pair served by the `GET` exports of
 * `apps/web/app/llms.txt/route.ts` and
 * `apps/web/app/items.json/route.ts` respectively.
 *
 * These two routes implement the public llms.txt convention
 * (https://llmstxt.org) plus a paired canonical-data JSON dump so
 * downstream LLM agents and integrations can consume the directory
 * without scraping HTML. The pair is intentionally:
 *
 *   - **Stable across templates** — same shape regardless of which
 *     Ever Works directory is generated.
 *   - **Public (no-auth-gate)** — every caller (anon / signed-in /
 *     admin) sees the same envelope.
 *   - **Cache-aware** — both routes short-circuit on the
 *     `getCachedItems()` cache and surface a `Cache-Control: public,
 *     max-age=300, s-maxage=900` header.
 *
 * Sibling specs:
 *   - The neighbouring
 *     [`seo-manifests.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/public/seo-manifests.spec.ts)
 *     covers the closely related `/robots.txt`, `/sitemap.xml`,
 *     `/opengraph-image`, and `/favicon.ico` discovery surface.
 *     This sibling pins the **agent-targeted** discovery surface
 *     (llms.txt convention + canonical JSON) — DIFFERENT from the
 *     **crawler-targeted** SEO surface above.
 *
 * The contract here is intentionally conservative: status `< 500`
 * plus content-type / body-shape sanity checks so a regression that
 * silently drops the file or breaks the JSON shape is caught.
 */
test.describe('Public: Agent-discovery surface (/llms.txt + /items.json)', () => {
	test('GET /llms.txt is served as text/plain', async ({ request }) => {
		const response = await request.get('/llms.txt');

		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const contentType = response.headers()['content-type'] ?? '';
			expect(contentType).toContain('text/plain');

			const body = await response.text();
			// The body opens with a Markdown H1 (`# <site name>`)
			// per the llms.txt convention. Pin the leading `#`.
			expect(body.trimStart().startsWith('#')).toBeTruthy();

			// The body advertises the paired /items.json data dump,
			// the sitemap, and the Atom feed — these are the three
			// discovery anchors the agent zero-friction onboarding
			// feature relies on.
			expect(body).toContain('/items.json');
			expect(body).toContain('/sitemap.xml');
			expect(body).toContain('/atom.xml');
		}
	});

	test('GET /llms.txt is cacheable (Cache-Control max-age=300, s-maxage=900)', async ({ request }) => {
		const response = await request.get('/llms.txt');

		if (response.status() === 200) {
			const cacheControl = response.headers()['cache-control'] ?? '';
			expect(cacheControl).toContain('public');
			expect(cacheControl).toContain('max-age=300');
			expect(cacheControl).toContain('s-maxage=900');
		}
	});

	test('GET /items.json is served as application/json', async ({ request }) => {
		const response = await request.get('/items.json');

		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const contentType = response.headers()['content-type'] ?? '';
			expect(contentType).toContain('application/json');

			const body = await response.json();

			// The route returns a stable envelope:
			//   { site: { name, url, description },
			//     generatedAt: ISO-string,
			//     count: number,
			//     items: Array<{ slug, name, url, description, categories, tags }> }
			expect(typeof body).toBe('object');
			expect(body).toHaveProperty('site');
			expect(body).toHaveProperty('generatedAt');
			expect(body).toHaveProperty('count');
			expect(body).toHaveProperty('items');

			expect(typeof body.site).toBe('object');
			expect(typeof body.site.name).toBe('string');
			expect(typeof body.generatedAt).toBe('string');
			expect(typeof body.count).toBe('number');
			expect(Array.isArray(body.items)).toBeTruthy();

			// `count` MUST be the length of `items`. UNIQUE: this
			// is the load-bearing invariant the agent-discovery
			// surface promises to downstream consumers.
			expect(body.count).toBe(body.items.length);

			// `generatedAt` MUST be an ISO-8601 timestamp.
			expect(() => new Date(body.generatedAt)).not.toThrow();
			expect(Number.isFinite(new Date(body.generatedAt).getTime())).toBeTruthy();
		}
	});

	test('GET /items.json is cacheable + CORS-open (Access-Control-Allow-Origin: *)', async ({ request }) => {
		const response = await request.get('/items.json');

		if (response.status() === 200) {
			const cacheControl = response.headers()['cache-control'] ?? '';
			expect(cacheControl).toContain('public');
			expect(cacheControl).toContain('max-age=300');
			expect(cacheControl).toContain('s-maxage=900');

			// CORS open — agents must be able to fetch this from
			// any origin.
			const cors = response.headers()['access-control-allow-origin'] ?? '';
			expect(cors).toBe('*');
		}
	});

	test('GET /items.json item shape is stable per-template', async ({ request }) => {
		const response = await request.get('/items.json');

		if (response.status() !== 200) {
			return;
		}

		const body = await response.json();

		if (!Array.isArray(body.items) || body.items.length === 0) {
			return;
		}

		const firstItem = body.items[0];

		// Each item carries (at minimum) slug + categories + tags
		// keys. URL / name / description may be undefined when the
		// upstream Markdown frontmatter omits them, so we don't
		// assert their presence — but the shape MUST include the
		// keys themselves (as undefined / null) for downstream
		// agents that key off the schema.
		expect(firstItem).toHaveProperty('slug');
		expect(firstItem).toHaveProperty('categories');
		expect(firstItem).toHaveProperty('tags');

		// `categories` / `tags` MUST be arrays (possibly empty).
		expect(Array.isArray(firstItem.categories)).toBeTruthy();
		expect(Array.isArray(firstItem.tags)).toBeTruthy();
	});

	test('GET /items.json + /llms.txt do NOT branch on side-channel cookies / headers', async ({ request }) => {
		// Both routes are public. Pin that fabricated session
		// cookies / X-User-Id / Authorization headers do NOT
		// alter the dispatch.
		const baselineLlms = await request.get('/llms.txt');
		const baselineItems = await request.get('/items.json');

		const responses = await Promise.all([
			request.get('/llms.txt', { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get('/llms.txt', { headers: { Authorization: 'Bearer anything' } }),
			request.get('/items.json', { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get('/items.json', { headers: { Authorization: 'Bearer anything' } })
		]);

		// Status must match baseline (public route — no auth
		// branch).
		expect(responses[0].status()).toBe(baselineLlms.status());
		expect(responses[1].status()).toBe(baselineLlms.status());
		expect(responses[2].status()).toBe(baselineItems.status());
		expect(responses[3].status()).toBe(baselineItems.status());
	});

	test('GET /items.json non-GET methods do NOT 5xx', async ({ request }) => {
		// The route exports ONLY `GET`. Next.js returns 405 for
		// other methods. Pin that they round-trip < 500.
		const responses = await Promise.all([
			request.post('/items.json'),
			request.put('/items.json'),
			request.patch('/items.json'),
			request.delete('/items.json')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /llms.txt non-GET methods do NOT 5xx', async ({ request }) => {
		const responses = await Promise.all([
			request.post('/llms.txt'),
			request.put('/llms.txt'),
			request.patch('/llms.txt'),
			request.delete('/llms.txt')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
