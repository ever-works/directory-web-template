import { test, expect } from '@playwright/test';

/**
 * Agent Access Contract v1 (Spec 062): the JSON Read API under `/data/`, the
 * stateless MCP endpoint at `/mcp` and the discovery documents. Shared with the
 * Ever Works minimal template, so the URLs, shapes and MCP tools are pinned.
 *
 * Routes: `apps/web/app/data/**`, `apps/web/app/mcp/route.ts`,
 * `apps/web/app/.well-known/**`; logic in `apps/web/lib/agent-access/`.
 */

const CACHE = 'public, max-age=300, s-maxage=900';

test.describe('Agent access: Read API (/data/*.json)', () => {
	for (const path of ['/data/directory.json', '/data/items.json', '/data/categories.json', '/data/tags.json']) {
		test(`GET ${path} is public JSON with open CORS and a CDN cache header`, async ({ request }) => {
			const response = await request.get(path);
			expect(response.status()).toBe(200);
			expect(response.headers()['content-type'] ?? '').toContain('application/json');
			expect(response.headers()['access-control-allow-origin']).toBe('*');
			expect(response.headers()['cache-control']).toBe(CACHE);
			const body = await response.json();
			expect(body.version).toBe(1);
		});
	}

	test('directory.json names every endpoint with absolute URLs', async ({ request }) => {
		const info = await (await request.get('/data/directory.json')).json();
		expect(info.generator).toBe('ever-works');
		for (const key of ['items', 'item', 'categories', 'tags', 'openapi', 'llms', 'llms_full', 'sitemap', 'mcp']) {
			expect(info.endpoints[key], key).toMatch(/^https?:\/\//);
		}
		expect(info.endpoints.item).toContain('{slug}');
		expect(typeof info.counts.items).toBe('number');
	});

	test('items.json total matches its items, and each item resolves at /data/items/{slug}.json', async ({ request }) => {
		const doc = await (await request.get('/data/items.json')).json();
		expect(doc.total).toBe(doc.items.length);
		if (doc.items.length === 0) return;
		const first = doc.items[0];
		for (const key of ['slug', 'name', 'description', 'url', 'website', 'categories', 'category_ids', 'tags', 'tag_ids', 'featured', 'logo', 'updated_at']) {
			expect(first, key).toHaveProperty(key);
		}
		const detail = await request.get(`/data/items/${first.slug}.json`);
		expect(detail.status()).toBe(200);
		const item = await detail.json();
		expect(item.slug).toBe(first.slug);
		expect(Array.isArray(item.related)).toBe(true);
		expect(item.markdown_url).toMatch(/\.md$/);
	});

	test('an unknown item answers 404 JSON', async ({ request }) => {
		const response = await request.get('/data/items/this-item-does-not-exist-062.json');
		expect(response.status()).toBe(404);
		expect(response.headers()['access-control-allow-origin']).toBe('*');
	});

	test('openapi.json is OpenAPI 3.1 for the Read API and /mcp', async ({ request }) => {
		const response = await request.get('/data/openapi.json');
		expect(response.status()).toBe(200);
		const doc = await response.json();
		expect(doc.openapi).toBe('3.1.0');
		expect(Object.keys(doc.paths)).toEqual(
			expect.arrayContaining(['/data/items.json', '/data/items/{slug}.json', '/mcp'])
		);
	});

	test('the legacy /items.json keeps its shape', async ({ request }) => {
		const body = await (await request.get('/items.json')).json();
		expect(body).toHaveProperty('site');
		expect(body.count).toBe(body.items.length);
	});
});

test.describe('Agent access: discovery', () => {
	test('/.well-known/mcp.json is the MCP server card', async ({ request }) => {
		const response = await request.get('/.well-known/mcp.json');
		expect(response.status()).toBe(200);
		const card = await response.json();
		expect(card.transport).toBe('streamable-http');
		expect(card.url).toMatch(/\/mcp$/);
		expect(card.tools).toEqual(['get_directory_info', 'search_items', 'list_items', 'get_item', 'list_categories', 'list_tags']);
	});

	test('/.well-known/api-catalog is an RFC 9727 linkset', async ({ request }) => {
		const response = await request.get('/.well-known/api-catalog');
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type'] ?? '').toContain('application/linkset+json');
		const catalog = await response.json();
		expect(catalog.linkset[0]['service-desc'][0].href).toMatch(/\/data\/openapi\.json$/);
	});

	test('llms.txt documents the Read API and the MCP endpoint', async ({ request }) => {
		const body = await (await request.get('/llms.txt')).text();
		expect(body).toContain('/data/items.json');
		expect(body).toContain('/data/openapi.json');
		expect(body).toMatch(/https?:\/\/[^\s)]+\/mcp/);
	});

	test('robots.txt does not disallow the agent surfaces', async ({ request }) => {
		const lines = (await (await request.get('/robots.txt')).text()).split('\n').map((line) => line.trim().toLowerCase());
		for (const path of ['/data/', '/mcp', '/.well-known/', '/llms.txt', '/']) {
			expect(lines, path).not.toContain(`disallow: ${path}`);
		}
	});

	test('pages link the Read API, OpenAPI and llms.txt in <head>', async ({ request }) => {
		const html = await (await request.get('/')).text();
		expect(html).toMatch(/<link[^>]+rel="alternate"[^>]+type="application\/json"[^>]+\/data\/items\.json/);
		expect(html).toMatch(/<link[^>]+rel="service-desc"[^>]+\/data\/openapi\.json/);
		expect(html).toMatch(/<link[^>]+type="text\/plain"[^>]+\/llms\.txt/);
	});
});

test.describe('Agent access: MCP (/mcp)', () => {
	const call = (request: import('@playwright/test').APIRequestContext, body: unknown) =>
		request.post('/mcp', {
			headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
			data: body
		});

	test('initialize negotiates the protocol version and needs no session', async ({ request }) => {
		const response = await call(request, {
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '0' } }
		});
		expect(response.status()).toBe(200);
		expect(response.headers()['access-control-allow-origin']).toBe('*');
		expect(response.headers()['mcp-session-id']).toBeUndefined();
		const body = await response.json();
		expect(body.result.protocolVersion).toBe('2025-06-18');
		expect(body.result.serverInfo.name).toBe('ever-works-directory');
	});

	test('tools/list and tools/call search_items', async ({ request }) => {
		const list = await (await call(request, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
		expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
			'get_directory_info',
			'search_items',
			'list_items',
			'get_item',
			'list_categories',
			'list_tags'
		]);
		const search = await (
			await call(request, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_items', arguments: { query: 'a', limit: 3 } } })
		).json();
		expect(typeof search.result.structuredContent.total).toBe('number');
		expect(JSON.parse(search.result.content[0].text)).toEqual(search.result.structuredContent);
	});

	test('GET is 405, notifications are 202, unknown methods are -32601', async ({ request }) => {
		expect((await request.get('/mcp')).status()).toBe(405);
		expect((await call(request, { jsonrpc: '2.0', method: 'notifications/initialized' })).status()).toBe(202);
		const unknown = await (await call(request, { jsonrpc: '2.0', id: 4, method: 'nope/nope' })).json();
		expect(unknown.error.code).toBe(-32601);
	});
});
