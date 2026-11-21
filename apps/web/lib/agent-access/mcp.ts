/**
 * Framework-free MCP server for an Ever Works directory (Agent Access Contract v1).
 *
 * Same wire behaviour as the minimal template's reference implementation
 * (`packages/agent-api/src/mcp.ts` there), so one client works with both:
 *
 * - Transport: MCP Streamable HTTP, stateless (no `Mcp-Session-Id`), every
 *   response one `application/json` JSON-RPC message; no SSE stream.
 * - `GET` (any method but POST / OPTIONS) -> 405, `Allow: POST, OPTIONS`.
 *   `OPTIONS` -> 204 CORS preflight. CORS `*` on every response.
 * - `initialize` negotiates `protocolVersion` from `MCP_PROTOCOL_VERSIONS`
 *   (an unknown version gets the latest). `ping`, `tools/list`, `tools/call`;
 *   `resources/list` and `prompts/list` answer empty lists.
 * - A message without an id (notification, client response) -> 202, empty body.
 * - Unknown method -> -32601. Batch -> -32600 (400). Invalid JSON -> -32700 (400).
 * - `tools/call`: an unknown tool name is JSON-RPC error -32602; invalid tool
 *   arguments (and an unknown slug) are a tool result with `isError: true`.
 *   Results are `{ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }`.
 *
 * `handleMcpRequest()` takes a WHATWG `Request` and returns a `Response`, so it
 * mounts unchanged in a Next.js route handler (app/mcp/route.ts).
 */

import type { AgentDataset } from './types';
import { ITEM_SORTS, filterSummaries, searchSummaries, sortSummaries, sortTagsByCount, type ItemSort } from './search';

/** Protocol revisions this server speaks, newest first. */
export const MCP_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;
export const MCP_LATEST_PROTOCOL_VERSION = MCP_PROTOCOL_VERSIONS[0];
export const MCP_SERVER_NAME = 'ever-works-directory';
export const MCP_SERVER_VERSION = '1.0.0';

/** Tool names (part of the public contract). */
export const MCP_TOOL_NAMES = [
	'get_directory_info',
	'search_items',
	'list_items',
	'get_item',
	'list_categories',
	'list_tags'
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

export const JSON_RPC_ERRORS = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603
} as const;

export const MCP_CORS_HEADERS: Readonly<Record<string, string>> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
	'Access-Control-Allow-Headers':
		'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
	'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
	'Access-Control-Max-Age': '86400'
};

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export interface McpToolDefinition {
	name: McpToolName;
	title: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations: typeof READ_ONLY;
}

/** The tools as `tools/list` advertises them. Names and input schemas are part of the contract. */
export function mcpToolDefinitions(itemsName = 'items'): McpToolDefinition[] {
	const noun = itemsName.toLowerCase();
	return [
		{
			name: 'get_directory_info',
			title: 'Directory info',
			description: `Describe this directory: name, purpose, how many ${noun}/categories/tags it lists, and its data endpoints.`,
			inputSchema: { type: 'object', properties: {}, additionalProperties: false },
			annotations: READ_ONLY
		},
		{
			name: 'search_items',
			title: `Search ${noun}`,
			description: `Full-text search of ${noun} by name, description, category and tag. Returns the best matches first. Use list_categories / list_tags to discover filter values.`,
			inputSchema: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'What to look for, e.g. "open source time tracking".' },
					category: { type: 'string', description: 'Optional category id, name or slug.' },
					tag: { type: 'string', description: 'Optional tag id, name or slug.' },
					limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
				},
				required: ['query'],
				additionalProperties: false
			},
			annotations: READ_ONLY
		},
		{
			name: 'list_items',
			title: `List ${noun}`,
			description: `List ${noun}, optionally filtered by category, tag or featured flag, with offset/limit paging.`,
			inputSchema: {
				type: 'object',
				properties: {
					category: { type: 'string', description: 'Category id, name or slug.' },
					tag: { type: 'string', description: 'Tag id, name or slug.' },
					featured: { type: 'boolean', description: 'Only featured entries.' },
					sort: { type: 'string', enum: [...ITEM_SORTS], default: 'featured' },
					offset: { type: 'integer', minimum: 0, default: 0 },
					limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 }
				},
				additionalProperties: false
			},
			annotations: READ_ONLY
		},
		{
			name: 'get_item',
			title: 'Get item details',
			description: `Full details of one entry by slug: description, website, categories, tags, Markdown write-up, images and related ${noun}.`,
			inputSchema: {
				type: 'object',
				properties: { slug: { type: 'string', description: 'Item slug (from search_items or list_items).' } },
				required: ['slug'],
				additionalProperties: false
			},
			annotations: READ_ONLY
		},
		{
			name: 'list_categories',
			title: 'List categories',
			description: `All categories with the number of ${noun} in each.`,
			inputSchema: { type: 'object', properties: {}, additionalProperties: false },
			annotations: READ_ONLY
		},
		{
			name: 'list_tags',
			title: 'List tags',
			description: 'Tags with usage counts, most used first.',
			inputSchema: {
				type: 'object',
				properties: { limit: { type: 'integer', minimum: 1, maximum: 1000 } },
				additionalProperties: false
			},
			annotations: READ_ONLY
		}
	];
}

// ---------------------------------------------------------------------------
// JSON-RPC plumbing
// ---------------------------------------------------------------------------

type JsonRpcId = string | number | null;

interface JsonRpcMessage {
	jsonrpc?: unknown;
	id?: unknown;
	method?: unknown;
	params?: unknown;
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
			...MCP_CORS_HEADERS,
			...extraHeaders
		}
	});
}

function rpcResult(id: JsonRpcId, result: unknown): Response {
	return jsonResponse({ jsonrpc: '2.0', id, result });
}

function rpcError(id: JsonRpcId, code: number, message: string, status = 200): Response {
	return jsonResponse({ jsonrpc: '2.0', id, error: { code, message } }, status);
}

/** A JSON object, or `{}` for anything else (missing params / arguments). */
function asObject(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** The protocol version the server answers with for a client's requested one. */
export function negotiateProtocolVersion(requested: unknown): string {
	return typeof requested === 'string' && (MCP_PROTOCOL_VERSIONS as ReadonlyArray<string>).includes(requested)
		? requested
		: MCP_LATEST_PROTOCOL_VERSION;
}

/** The `instructions` paragraph sent on `initialize`. */
export function buildInstructions(dataset: Pick<AgentDataset, 'info'>): string {
	const d = dataset.info;
	return (
		`${d.name} (${d.url}) — ${d.description} It lists ${d.counts.items} ${d.items_name.toLowerCase()} in ` +
		`${d.counts.categories} categories. Use search_items for questions like "best open source options", ` +
		`list_items to browse a category or tag, get_item for full details of one entry, and list_categories / ` +
		`list_tags to discover filters (get_directory_info returns the counts and the JSON Read API endpoints). ` +
		`Always cite the entry's directory url.`
	);
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/** Invalid tool arguments: reported as a tool result with `isError: true`. */
class ToolInputError extends Error {}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value !== 'string') throw new ToolInputError(`"${key}" must be a string`);
	return value.trim() || undefined;
}

/** An integer argument clamped to [min, max]; `fallback` when absent. */
function integer(input: Record<string, unknown>, key: string, fallback: number, min: number, max: number): number {
	const value = input[key];
	if (value === undefined || value === null) return fallback;
	const number = typeof value === 'string' ? Number(value) : value;
	if (typeof number !== 'number' || !Number.isFinite(number)) throw new ToolInputError(`"${key}" must be a number`);
	return Math.min(max, Math.max(min, Math.floor(number)));
}

async function callTool(name: McpToolName, rawArgs: unknown, dataset: AgentDataset): Promise<unknown> {
	const input = asObject(rawArgs);
	switch (name) {
		case 'get_directory_info':
			return dataset.info;

		case 'search_items': {
			const query = optionalString(input, 'query');
			if (!query) throw new ToolInputError('"query" is required');
			const limit = integer(input, 'limit', 10, 1, 50);
			const filtered = filterSummaries(dataset.items, {
				category: optionalString(input, 'category'),
				tag: optionalString(input, 'tag')
			});
			const hits = searchSummaries(filtered, query);
			return { query, total: hits.length, items: hits.slice(0, limit) };
		}

		case 'list_items': {
			const sort = optionalString(input, 'sort') ?? 'featured';
			if (!(ITEM_SORTS as ReadonlyArray<string>).includes(sort)) {
				throw new ToolInputError(`"sort" must be one of ${ITEM_SORTS.join(', ')}`);
			}
			if (input.featured !== undefined && typeof input.featured !== 'boolean') {
				throw new ToolInputError('"featured" must be a boolean');
			}
			const offset = integer(input, 'offset', 0, 0, Number.MAX_SAFE_INTEGER);
			const limit = integer(input, 'limit', 25, 1, 100);
			const filtered = filterSummaries(dataset.items, {
				category: optionalString(input, 'category'),
				tag: optionalString(input, 'tag'),
				featured: input.featured === true
			});
			const sorted = sortSummaries(filtered, sort as ItemSort);
			return { total: sorted.length, offset, limit, items: sorted.slice(offset, offset + limit) };
		}

		case 'get_item': {
			const slug = optionalString(input, 'slug');
			if (!slug) throw new ToolInputError('"slug" is required');
			const item = await dataset.getItem(slug);
			if (!item) throw new ToolInputError(`No item with slug "${slug}". Use search_items to find valid slugs.`);
			return item;
		}

		case 'list_categories':
			return { total: dataset.categories.length, categories: dataset.categories };

		case 'list_tags': {
			const tags = sortTagsByCount(dataset.tags);
			const limit = integer(input, 'limit', tags.length || 1, 1, 100000);
			return { total: tags.length, tags: tags.slice(0, limit) };
		}
	}
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Answer one MCP Streamable HTTP request.
 *
 * @param loadDataset - Resolves the directory data; called only for requests that need it.
 */
export async function handleMcpRequest(request: Request, loadDataset: () => Promise<AgentDataset>): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: { ...MCP_CORS_HEADERS } });
	}

	if (request.method !== 'POST') {
		return jsonResponse(
			{
				jsonrpc: '2.0',
				id: null,
				error: { code: -32000, message: 'Method not allowed. POST JSON-RPC messages to this endpoint.' }
			},
			405,
			{ Allow: 'POST, OPTIONS' }
		);
	}

	let message: unknown;
	try {
		message = await request.json();
	} catch {
		return rpcError(null, JSON_RPC_ERRORS.PARSE_ERROR, 'Parse error: body must be a JSON-RPC 2.0 message', 400);
	}

	if (Array.isArray(message)) {
		return rpcError(null, JSON_RPC_ERRORS.INVALID_REQUEST, 'Batch requests are not supported', 400);
	}
	if (message === null || typeof message !== 'object') {
		return rpcError(null, JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid request', 400);
	}

	const rpc = message as JsonRpcMessage;
	const hasId = typeof rpc.id === 'string' || typeof rpc.id === 'number';
	const id: JsonRpcId = hasId ? (rpc.id as string | number) : null;

	// Notifications and client responses are acknowledged without a body.
	if (typeof rpc.method !== 'string') {
		if (!hasId) return new Response(null, { status: 202, headers: { ...MCP_CORS_HEADERS } });
		return rpcError(id, JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid request: missing method', 400);
	}
	if (!hasId) return new Response(null, { status: 202, headers: { ...MCP_CORS_HEADERS } });

	const params = asObject(rpc.params);

	try {
		switch (rpc.method) {
			case 'initialize': {
				const dataset = await loadDataset();
				return rpcResult(id, {
					protocolVersion: negotiateProtocolVersion(params.protocolVersion),
					capabilities: { tools: { listChanged: false } },
					serverInfo: {
						name: MCP_SERVER_NAME,
						title: dataset.info.name,
						version: MCP_SERVER_VERSION,
						websiteUrl: dataset.info.url
					},
					instructions: buildInstructions(dataset)
				});
			}

			case 'ping':
				return rpcResult(id, {});

			case 'tools/list': {
				const dataset = await loadDataset();
				return rpcResult(id, { tools: mcpToolDefinitions(dataset.info.items_name) });
			}

			case 'tools/call': {
				const name = params.name;
				if (typeof name !== 'string' || !(MCP_TOOL_NAMES as ReadonlyArray<string>).includes(name)) {
					return rpcError(id, JSON_RPC_ERRORS.INVALID_PARAMS, `Unknown tool: ${String(name)}`);
				}
				const dataset = await loadDataset();
				try {
					const result = await callTool(name as McpToolName, params.arguments, dataset);
					return rpcResult(id, {
						content: [{ type: 'text', text: JSON.stringify(result) }],
						structuredContent: result
					});
				} catch (error) {
					if (error instanceof ToolInputError) {
						return rpcResult(id, { content: [{ type: 'text', text: error.message }], isError: true });
					}
					throw error;
				}
			}

			case 'resources/list':
				return rpcResult(id, { resources: [] });

			case 'prompts/list':
				return rpcResult(id, { prompts: [] });

			default:
				return rpcError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${rpc.method}`);
		}
	} catch (error) {
		// The detail stays in the server log: it can name filesystem paths.
		console.error('[mcp] request failed:', error);
		return rpcError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error while reading the directory data');
	}
}
