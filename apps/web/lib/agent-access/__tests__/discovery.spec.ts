import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildApiCatalog, buildLlmsTxt, buildMcpServerCard, mcpClientConfig, mcpClientKey } from '../discovery';
import { slugFromJsonSegment } from '../http';
import { buildOpenApiDocument } from '../openapi';
import { buildCatalog } from '../dataset';
import { fixtureCatalog, fixtureInput } from './fixtures';

/**
 * Discovery documents of Agent Access Contract v1: `/.well-known/mcp.json`,
 * `/.well-known/api-catalog`, `/data/openapi.json`, `/llms.txt`.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

const { info, categories } = fixtureCatalog();

describe('MCP server card', () => {
	it('has the contract shape with absolute URLs', () => {
		assert.deepEqual(buildMcpServerCard(info), {
			name: 'ever-works-directory',
			title: 'Example Tools',
			description: 'The best time tracking tools.',
			version: '1.0.0',
			url: 'https://tools.example.com/mcp',
			transport: 'streamable-http',
			protocolVersions: ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'],
			authentication: 'none',
			tools: ['get_directory_info', 'search_items', 'list_items', 'get_item', 'list_categories', 'list_tags'],
			documentation: 'https://tools.example.com/llms.txt',
			openapi: 'https://tools.example.com/data/openapi.json'
		});
	});

	it('is null when the deployment serves no MCP endpoint', () => {
		assert.equal(buildMcpServerCard(buildCatalog({ ...fixtureInput, mcpEnabled: false }).info), null);
	});
});

describe('API catalog (RFC 9727)', () => {
	it('anchors one linkset entry at /data/ with service-desc, service-doc and service-meta', () => {
		assert.deepEqual(buildApiCatalog(info), {
			linkset: [
				{
					anchor: 'https://tools.example.com/data/',
					'service-desc': [{ href: 'https://tools.example.com/data/openapi.json', type: 'application/openapi+json' }],
					'service-doc': [{ href: 'https://tools.example.com/llms.txt', type: 'text/plain' }],
					'service-meta': [{ href: 'https://tools.example.com/.well-known/mcp.json', type: 'application/json' }]
				}
			]
		});
		const noMcp = buildApiCatalog(buildCatalog({ ...fixtureInput, mcpEnabled: false }).info);
		assert.equal('service-meta' in noMcp.linkset[0], false);
	});
});

describe('OpenAPI 3.1', () => {
	const doc = buildOpenApiDocument(info) as Record<string, any>;

	it('describes the five Read API endpoints and /mcp on the site origin', () => {
		assert.equal(doc.openapi, '3.1.0');
		assert.deepEqual(doc.servers, [{ url: 'https://tools.example.com' }]);
		assert.deepEqual(Object.keys(doc.paths), [
			'/data/directory.json',
			'/data/items.json',
			'/data/items/{slug}.json',
			'/data/categories.json',
			'/data/tags.json',
			'/mcp'
		]);
		assert.ok(doc.paths['/mcp'].post);
		assert.equal(doc.paths['/data/items/{slug}.json'].get.parameters[0].name, 'slug');
	});

	it('every $ref resolves to a component schema', () => {
		const refs = JSON.stringify(doc).match(/#\/components\/schemas\/[A-Za-z]+/g) ?? [];
		assert.ok(refs.length > 0);
		for (const ref of refs) {
			assert.ok(doc.components.schemas[ref.split('/').pop()!], ref);
		}
	});

	it('the ItemSummary schema requires exactly the contract fields', () => {
		const summary = fixtureCatalog().items[0];
		assert.deepEqual([...doc.components.schemas.ItemSummary.required].sort(), Object.keys(summary).sort());
		assert.deepEqual([...doc.components.schemas.DirectoryInfo.required].sort(), Object.keys(info).sort());
	});

	it('omits /mcp when there is no MCP endpoint', () => {
		const noMcp = buildOpenApiDocument(buildCatalog({ ...fixtureInput, mcpEnabled: false }).info) as Record<string, any>;
		assert.equal(noMcp.paths['/mcp'], undefined);
	});
});

describe('llms.txt', () => {
	const body = buildLlmsTxt({ info, categories });

	it('opens with the H1 and the summary blockquote', () => {
		assert.ok(body.startsWith('# Example Tools\n\n> The best time tracking tools.\n'));
	});

	it('documents the Read API, OpenAPI and MCP with absolute URLs and a client config', () => {
		for (const url of [
			'https://tools.example.com/data/directory.json',
			'https://tools.example.com/data/items.json',
			'https://tools.example.com/data/items/{slug}.json',
			'https://tools.example.com/data/categories.json',
			'https://tools.example.com/data/tags.json',
			'https://tools.example.com/data/openapi.json',
			'https://tools.example.com/mcp',
			'https://tools.example.com/.well-known/mcp.json'
		]) {
			assert.ok(body.includes(url), url);
		}
		assert.ok(body.includes('"url": "https://tools.example.com/mcp"'));
		assert.ok(body.includes('claude mcp add --transport http example-tools https://tools.example.com/mcp'));
	});

	it('keeps the legacy anchors (items.json, sitemap, feeds, Markdown mirrors)', () => {
		for (const fragment of ['/items.json', '/sitemap.xml', '/atom.xml', '/rss.xml', '/feed.json', '/llms-full.txt', '/items/<slug>.md']) {
			assert.ok(body.includes(fragment), fragment);
		}
		assert.ok(!/\]\(\//.test(body), 'no relative Markdown links');
	});

	it('lists categories that have items, with links and counts', () => {
		assert.ok(body.includes('- [Time Tracking](https://tools.example.com/categories/time-tracking) (3): Track hours.'));
		assert.ok(body.includes('- [Invoicing](https://tools.example.com/categories/invoicing) (1)'));
		assert.ok(!body.includes('Empty Category'));
		assert.ok(!buildLlmsTxt({ info, categories, categoriesEnabled: false }).includes('## Categories'));
	});

	it('mentions the submit page when it exists', () => {
		assert.ok(body.includes('[Submit a tool](https://tools.example.com/submit)'));
	});
});

describe('MCP client config', () => {
	it('keys the server by a slug of the directory name', () => {
		assert.equal(mcpClientKey(info), 'example-tools');
		assert.deepEqual(JSON.parse(mcpClientConfig(info)!), {
			mcpServers: { 'example-tools': { type: 'http', url: 'https://tools.example.com/mcp' } }
		});
	});
});

describe('slugFromJsonSegment', () => {
	it('accepts `<slug>.json` only', () => {
		assert.equal(slugFromJsonSegment('toggl.json'), 'toggl');
		assert.equal(slugFromJsonSegment('my_tool-2.json'), 'my_tool-2');
		assert.equal(slugFromJsonSegment('toggl'), null);
		assert.equal(slugFromJsonSegment('toggl.md'), null);
		assert.equal(slugFromJsonSegment('.json'), null);
		assert.equal(slugFromJsonSegment('..%2Fetc.json'), null);
		assert.equal(slugFromJsonSegment('%E0%A4%A.json'), null);
		assert.equal(slugFromJsonSegment(undefined), null);
	});
});
