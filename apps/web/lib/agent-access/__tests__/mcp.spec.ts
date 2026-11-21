import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	MCP_LATEST_PROTOCOL_VERSION,
	MCP_TOOL_NAMES,
	handleMcpRequest,
	negotiateProtocolVersion
} from '../mcp';
import type { AgentDataset } from '../types';
import { fixtureDataset } from './fixtures';

/**
 * MCP Streamable HTTP handler (lib/agent-access/mcp.ts), Agent Access Contract v1.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

const URL = 'https://tools.example.com/mcp';

function post(body: unknown, raw = false): Request {
	return new Request(URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
		body: raw ? (body as string) : JSON.stringify(body)
	});
}

async function rpc(
	method: string,
	params?: Record<string, unknown>,
	dataset: () => Promise<AgentDataset> = async () => fixtureDataset()
) {
	const response = await handleMcpRequest(post({ jsonrpc: '2.0', id: 1, method, params }), dataset);
	return { response, body: (await response.json()) as Record<string, any> };
}

async function callTool(name: string, args?: Record<string, unknown>) {
	const { response, body } = await rpc('tools/call', { name, arguments: args });
	assert.equal(response.status, 200);
	return body.result as { content: Array<{ type: string; text: string }>; structuredContent?: any; isError?: boolean };
}

describe('MCP transport', () => {
	it('answers OPTIONS with a 204 CORS preflight', async () => {
		const response = await handleMcpRequest(new Request(URL, { method: 'OPTIONS' }), async () => fixtureDataset());
		assert.equal(response.status, 204);
		assert.equal(response.headers.get('access-control-allow-origin'), '*');
		assert.match(response.headers.get('access-control-allow-headers') ?? '', /Mcp-Protocol-Version/);
	});

	it('answers GET with 405 and Allow: POST, OPTIONS (no SSE stream)', async () => {
		const response = await handleMcpRequest(new Request(URL, { method: 'GET' }), async () => fixtureDataset());
		assert.equal(response.status, 405);
		assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
		assert.equal(response.headers.get('access-control-allow-origin'), '*');
	});

	it('acknowledges notifications with 202 and an empty body', async () => {
		const response = await handleMcpRequest(
			post({ jsonrpc: '2.0', method: 'notifications/initialized' }),
			async () => fixtureDataset()
		);
		assert.equal(response.status, 202);
		assert.equal(await response.text(), '');
		assert.equal(response.headers.get('access-control-allow-origin'), '*');
	});

	it('rejects invalid JSON (-32700), batches, non-objects and a missing method (-32600)', async () => {
		const parse = await handleMcpRequest(post('{not json', true), async () => fixtureDataset());
		assert.equal(parse.status, 400);
		assert.equal((await parse.json()).error.code, -32700);

		const batch = await handleMcpRequest(post([{ jsonrpc: '2.0', id: 1, method: 'ping' }]), async () => fixtureDataset());
		assert.equal(batch.status, 400);
		assert.equal((await batch.json()).error.code, -32600);

		const scalar = await handleMcpRequest(post('"hello"', true), async () => fixtureDataset());
		assert.equal(scalar.status, 400);
		assert.equal((await scalar.json()).error.code, -32600);

		const noMethod = await handleMcpRequest(post({ jsonrpc: '2.0', id: 7 }), async () => fixtureDataset());
		assert.equal(noMethod.status, 400);
		assert.deepEqual((await noMethod.json()).id, 7);

		// A client response (no method, no id) is acknowledged like a notification.
		const clientResponse = await handleMcpRequest(post({ jsonrpc: '2.0', result: {} }), async () => fixtureDataset());
		assert.equal(clientResponse.status, 202);
	});

	it('answers resources/list and prompts/list with empty lists', async () => {
		assert.deepEqual((await rpc('resources/list')).body.result, { resources: [] });
		assert.deepEqual((await rpc('prompts/list')).body.result, { prompts: [] });
	});

	it('answers unknown methods with -32601 and sends no session id', async () => {
		const { response, body } = await rpc('completion/complete');
		assert.equal(response.status, 200);
		assert.equal(body.error.code, -32601);
		assert.equal(body.id, 1);
		assert.equal(response.headers.get('mcp-session-id'), null);
		assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
	});

	it('answers ping with an empty result', async () => {
		const { body } = await rpc('ping');
		assert.deepEqual(body, { jsonrpc: '2.0', id: 1, result: {} });
	});

	it('reports a data loading failure as -32603', async () => {
		const { body } = await rpc('tools/call', { name: 'list_tags' }, async () => {
			throw new Error('content unavailable');
		});
		assert.equal(body.error.code, -32603);
	});
});

describe('initialize', () => {
	it('echoes a supported protocol version and describes the server', async () => {
		const { body } = await rpc('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'test', version: '0' }
		});
		assert.equal(body.result.protocolVersion, '2025-06-18');
		assert.deepEqual(body.result.capabilities, { tools: { listChanged: false } });
		assert.deepEqual(body.result.serverInfo, {
			name: 'ever-works-directory',
			title: 'Example Tools',
			version: '1.0.0',
			websiteUrl: 'https://tools.example.com'
		});
		assert.ok(body.result.instructions.startsWith('Example Tools (https://tools.example.com)'));
		assert.match(body.result.instructions, /It lists 4 tools in 3 categories/);
		for (const tool of MCP_TOOL_NAMES) assert.ok(body.result.instructions.includes(tool), tool);
	});

	it('answers an unknown protocol version with the latest', async () => {
		const { body } = await rpc('initialize', { protocolVersion: '1999-01-01' });
		assert.equal(body.result.protocolVersion, MCP_LATEST_PROTOCOL_VERSION);
		assert.equal(MCP_LATEST_PROTOCOL_VERSION, '2025-11-25');
		for (const version of ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']) {
			assert.equal(negotiateProtocolVersion(version), version);
		}
		assert.equal(negotiateProtocolVersion(undefined), '2025-11-25');
	});
});

describe('tools/list', () => {
	it('lists the six contract tools with object input schemas', async () => {
		const { body } = await rpc('tools/list');
		const tools = body.result.tools as Array<{ name: string; inputSchema: any; annotations: any }>;
		assert.deepEqual(
			tools.map((tool) => tool.name),
			['get_directory_info', 'search_items', 'list_items', 'get_item', 'list_categories', 'list_tags']
		);
		for (const tool of tools) {
			assert.equal(tool.inputSchema.type, 'object', tool.name);
			assert.equal(tool.annotations.readOnlyHint, true, tool.name);
		}
		const search = tools.find((tool) => tool.name === 'search_items')!;
		assert.deepEqual(search.inputSchema.required, ['query']);
		assert.deepEqual(Object.keys(search.inputSchema.properties), ['query', 'category', 'tag', 'limit']);
		assert.equal(search.inputSchema.properties.limit.maximum, 50);
		const list = tools.find((tool) => tool.name === 'list_items')!;
		assert.deepEqual(Object.keys(list.inputSchema.properties), ['category', 'tag', 'featured', 'sort', 'offset', 'limit']);
		assert.deepEqual(list.inputSchema.properties.sort.enum, ['featured', 'name-asc', 'name-desc', 'date-desc', 'date-asc']);
		assert.equal(list.inputSchema.properties.limit.maximum, 100);
		assert.deepEqual(tools.find((tool) => tool.name === 'get_item')!.inputSchema.required, ['slug']);
	});
});

describe('tools/call', () => {
	it('get_directory_info returns DirectoryInfo as structuredContent and JSON text', async () => {
		const result = await callTool('get_directory_info', {});
		assert.equal(result.structuredContent.name, 'Example Tools');
		assert.equal(result.structuredContent.endpoints.mcp, 'https://tools.example.com/mcp');
		assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
		assert.equal(result.isError, undefined);
	});

	it('search_items ranks and limits (default 10, max 50)', async () => {
		const result = await callTool('search_items', { query: 'open source', limit: 1 });
		assert.equal(result.structuredContent.query, 'open source');
		assert.equal(result.structuredContent.total, 2);
		assert.equal(result.structuredContent.items.length, 1);
		const all = await callTool('search_items', { query: 'time', limit: 500 });
		assert.equal(all.structuredContent.total, 4);
		const filtered = await callTool('search_items', { query: 'time', category: 'Invoicing' });
		assert.deepEqual(
			filtered.structuredContent.items.map((entry: { slug: string }) => entry.slug),
			['invoice-ninja']
		);
	});

	it('search_items without a query is a tool error, not a protocol error', async () => {
		for (const args of [{}, { query: '' }, { query: 3 }]) {
			const result = await callTool('search_items', args);
			assert.equal(result.isError, true, JSON.stringify(args));
			assert.match(result.content[0].text, /query/);
		}
		// A query with no letter or digit has no token: every item, as in the minimal template.
		assert.equal((await callTool('search_items', { query: '  !! ' })).structuredContent.total, 4);
		const badLimit = await callTool('search_items', { query: 'time', limit: 'many' });
		assert.equal(badLimit.isError, true);
	});

	it('list_items sorts (featured first, then name), paginates and filters', async () => {
		const page = await callTool('list_items', { offset: 1, limit: 2 });
		assert.deepEqual(
			{ ...page.structuredContent, items: page.structuredContent.items.map((entry: { slug: string }) => entry.slug) },
			{ total: 4, offset: 1, limit: 2, items: ['invoice-ninja', 'kimai'] }
		);
		const byDate = await callTool('list_items', { sort: 'date-desc', limit: 1 });
		assert.equal(byDate.structuredContent.items[0].slug, 'kimai');
		assert.equal((await callTool('list_items', { sort: 'random' })).isError, true);
		assert.equal((await callTool('list_items', { featured: false })).structuredContent.total, 4, 'false does not filter');
		const defaults = await callTool('list_items');
		assert.equal(defaults.structuredContent.limit, 25);
		assert.equal(defaults.structuredContent.offset, 0);
		const featured = await callTool('list_items', { featured: true, tag: 'free' });
		assert.deepEqual(
			featured.structuredContent.items.map((entry: { slug: string }) => entry.slug),
			['toggl']
		);
		const clamped = await callTool('list_items', { limit: 1000, offset: -5 });
		assert.equal(clamped.structuredContent.limit, 100);
		assert.equal(clamped.structuredContent.offset, 0);
		assert.equal((await callTool('list_items', { featured: 'yes' })).isError, true);
	});

	it('get_item returns ItemDetail, or isError when the slug is unknown', async () => {
		const found = await callTool('get_item', { slug: 'toggl' });
		assert.equal(found.structuredContent.slug, 'toggl');
		assert.equal(found.structuredContent.markdown, '# Toggl\n\nTrack time.');
		assert.deepEqual(found.structuredContent.related, ['kimai', 'invoice-ninja']);

		const missing = await callTool('get_item', { slug: 'nope' });
		assert.equal(missing.isError, true);
		assert.equal(missing.structuredContent, undefined);
		assert.match(missing.content[0].text, /nope/);

		assert.equal((await callTool('get_item', {})).isError, true);
	});

	it('list_categories and list_tags (count desc, optional limit)', async () => {
		const categories = await callTool('list_categories');
		assert.equal(categories.structuredContent.total, 3);
		assert.equal(categories.structuredContent.categories[0].id, 'time-tracking');

		const tags = await callTool('list_tags', { limit: 2 });
		assert.equal(tags.structuredContent.total, 3);
		assert.deepEqual(
			tags.structuredContent.tags.map((tag: { id: string }) => tag.id),
			['free', 'open-source']
		);
		assert.equal((await callTool('list_tags')).structuredContent.tags.length, 3);
	});

	it('an unknown tool is -32602; missing or non-object arguments count as {}', async () => {
		const { body } = await rpc('tools/call', { name: 'delete_everything', arguments: {} });
		assert.equal(body.error.code, -32602);
		const { body: list } = await rpc('tools/call', { name: 'list_tags', arguments: [1, 2] });
		assert.equal(list.result.structuredContent.total, 3);
		const { body: info } = await rpc('tools/call', { name: 'get_directory_info' });
		assert.equal(info.result.structuredContent.version, 1);
	});

	it('processes a message that omits "jsonrpc" (lenient, as the reference implementation)', async () => {
		const response = await handleMcpRequest(post({ id: 'a', method: 'ping' }), async () => fixtureDataset());
		assert.deepEqual(await response.json(), { jsonrpc: '2.0', id: 'a', result: {} });
	});
});
