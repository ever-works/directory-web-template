/**
 * OpenAPI 3.1 document of the Agent Access Read API (`/data/*`) and the MCP
 * endpoint (`/mcp`). Served at `/data/openapi.json`.
 *
 * Not to be confused with `public/openapi.json`, the template's own server API
 * spec (`/api/*`), which is generated separately and documents authenticated
 * routes.
 */

import type { DirectoryInfo } from './types';
import { MCP_LATEST_PROTOCOL_VERSION, MCP_TOOL_NAMES } from './mcp';

const nullableString = { type: ['string', 'null'] };
const stringArray = { type: 'array', items: { type: 'string' } };

const schemas = {
	DirectoryInfo: {
		type: 'object',
		required: [
			'version',
			'name',
			'description',
			'url',
			'item_name',
			'items_name',
			'counts',
			'updated_at',
			'data_repository',
			'submit_url',
			'endpoints',
			'generator'
		],
		properties: {
			version: { const: 1 },
			name: { type: 'string' },
			description: { type: 'string' },
			url: { type: 'string', format: 'uri' },
			item_name: { type: 'string', description: 'Singular noun for one item, e.g. "Tool".' },
			items_name: { type: 'string', description: 'Plural noun, e.g. "Tools".' },
			counts: {
				type: 'object',
				required: ['items', 'categories', 'tags', 'collections', 'comparisons'],
				properties: {
					items: { type: 'integer' },
					categories: { type: 'integer' },
					tags: { type: 'integer' },
					collections: { type: 'integer' },
					comparisons: { type: 'integer' }
				}
			},
			updated_at: { ...nullableString, format: 'date-time', description: 'Newest item update.' },
			data_repository: { ...nullableString, description: 'Public Git URL of the data repository, when known.' },
			submit_url: { ...nullableString, description: 'Page where a new item can be submitted, when enabled.' },
			endpoints: {
				type: 'object',
				required: ['items', 'item', 'categories', 'tags', 'openapi', 'llms', 'llms_full', 'sitemap', 'mcp'],
				properties: {
					items: { type: 'string' },
					item: { type: 'string', description: 'URL template with a `{slug}` placeholder.' },
					categories: { type: 'string' },
					tags: { type: 'string' },
					openapi: { type: 'string' },
					llms: { type: 'string' },
					llms_full: { type: 'string' },
					sitemap: { type: 'string' },
					mcp: nullableString
				}
			},
			generator: { enum: ['ever-works-minimal', 'ever-works'] }
		}
	},
	ItemSummary: {
		type: 'object',
		required: [
			'slug',
			'name',
			'description',
			'url',
			'website',
			'categories',
			'category_ids',
			'tags',
			'tag_ids',
			'featured',
			'logo',
			'updated_at'
		],
		properties: {
			slug: { type: 'string' },
			name: { type: 'string' },
			description: { type: 'string' },
			url: { type: 'string', format: 'uri', description: 'The item page on this directory.' },
			website: { ...nullableString, description: "The item's own website." },
			categories: { ...stringArray, description: 'Category display names.' },
			category_ids: { ...stringArray, description: 'Category ids (see /data/categories.json).' },
			tags: { ...stringArray, description: 'Tag display names.' },
			tag_ids: { ...stringArray, description: 'Tag ids (see /data/tags.json).' },
			featured: { type: 'boolean' },
			logo: nullableString,
			updated_at: { ...nullableString, format: 'date-time' }
		}
	},
	ItemDetail: {
		allOf: [
			{ $ref: '#/components/schemas/ItemSummary' },
			{
				type: 'object',
				required: ['markdown', 'markdown_url', 'images', 'brand', 'publisher', 'related'],
				properties: {
					markdown: { ...nullableString, description: 'Raw Markdown body of the item page.' },
					markdown_url: { type: 'string', format: 'uri' },
					images: stringArray,
					brand: nullableString,
					publisher: nullableString,
					related: { ...stringArray, description: 'Slugs of similar items (shared tags / categories).' }
				}
			}
		]
	},
	CategoryEntry: {
		type: 'object',
		required: ['id', 'name', 'description', 'count', 'url'],
		properties: {
			id: { type: 'string' },
			name: { type: 'string' },
			description: nullableString,
			count: { type: 'integer' },
			url: { type: 'string', format: 'uri' }
		}
	},
	TagEntry: {
		type: 'object',
		required: ['id', 'name', 'count', 'url'],
		properties: {
			id: { type: 'string' },
			name: { type: 'string' },
			count: { type: 'integer' },
			url: { type: 'string', format: 'uri' }
		}
	},
	ItemsDocument: {
		type: 'object',
		required: ['version', 'total', 'items'],
		properties: {
			version: { const: 1 },
			total: { type: 'integer' },
			items: { type: 'array', items: { $ref: '#/components/schemas/ItemSummary' } }
		}
	},
	CategoriesDocument: {
		type: 'object',
		required: ['version', 'total', 'categories'],
		properties: {
			version: { const: 1 },
			total: { type: 'integer' },
			categories: { type: 'array', items: { $ref: '#/components/schemas/CategoryEntry' } }
		}
	},
	TagsDocument: {
		type: 'object',
		required: ['version', 'total', 'tags'],
		properties: {
			version: { const: 1 },
			total: { type: 'integer' },
			tags: { type: 'array', items: { $ref: '#/components/schemas/TagEntry' } }
		}
	},
	JsonRpcMessage: {
		type: 'object',
		required: ['jsonrpc'],
		properties: {
			jsonrpc: { const: '2.0' },
			id: { type: ['string', 'integer', 'null'] },
			method: { type: 'string' },
			params: { type: 'object' },
			result: { type: 'object' },
			error: {
				type: 'object',
				properties: { code: { type: 'integer' }, message: { type: 'string' } }
			}
		}
	}
} as const;

function jsonGet(summary: string, description: string, schema: string, operationId: string) {
	return {
		get: {
			operationId,
			summary,
			description,
			tags: ['Read API'],
			responses: {
				'200': {
					description: 'OK',
					headers: {
						'Access-Control-Allow-Origin': { schema: { type: 'string', const: '*' } },
						'Cache-Control': { schema: { type: 'string' } }
					},
					content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } }
				}
			}
		}
	};
}

export function buildOpenApiDocument(info: DirectoryInfo): Record<string, unknown> {
	const paths: Record<string, unknown> = {
		'/data/directory.json': jsonGet(
			'Directory info',
			'Name, description, counts and endpoint URLs of this directory.',
			'DirectoryInfo',
			'getDirectory'
		),
		'/data/items.json': jsonGet('All items', 'Every item as an ItemSummary, in directory order.', 'ItemsDocument', 'listItems'),
		'/data/items/{slug}.json': {
			get: {
				operationId: 'getItem',
				summary: 'One item',
				description: 'Full details of one item, including its Markdown body and related items.',
				tags: ['Read API'],
				parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
				responses: {
					'200': {
						description: 'OK',
						content: { 'application/json': { schema: { $ref: '#/components/schemas/ItemDetail' } } }
					},
					'404': { description: 'No item with that slug.' }
				}
			}
		},
		'/data/categories.json': jsonGet(
			'All categories',
			'Every category with its item count.',
			'CategoriesDocument',
			'listCategories'
		),
		'/data/tags.json': jsonGet('All tags', 'Every tag with its item count, most used first.', 'TagsDocument', 'listTags')
	};

	if (info.endpoints.mcp) {
		paths['/mcp'] = {
			post: {
				operationId: 'mcp',
				summary: 'Model Context Protocol (Streamable HTTP, stateless)',
				description:
					`JSON-RPC 2.0 over HTTP POST, one JSON response per request (no SSE, no session). ` +
					`Protocol version ${MCP_LATEST_PROTOCOL_VERSION} (2025-06-18, 2025-03-26 and 2024-11-05 accepted). ` +
					`Tools: ${MCP_TOOL_NAMES.join(', ')}. GET answers 405.`,
				tags: ['MCP'],
				requestBody: {
					required: true,
					content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcMessage' } } }
				},
				responses: {
					'200': {
						description: 'JSON-RPC response',
						content: { 'application/json': { schema: { $ref: '#/components/schemas/JsonRpcMessage' } } }
					},
					'202': { description: 'Notification accepted (empty body).' },
					'400': { description: 'Invalid JSON or JSON-RPC envelope (batches are not supported).' }
				}
			}
		};
	}

	return {
		openapi: '3.1.0',
		info: {
			title: `${info.name} — Read API`,
			version: '1.0.0',
			description:
				`Public, read-only JSON API of ${info.name}: ${info.counts.items} ${info.items_name.toLowerCase()}, ` +
				`their categories and tags. No authentication. CORS is open (\`*\`). ` +
				`Agent Access Contract v1, shared by every Ever Works directory.`
		},
		servers: [{ url: info.url }],
		externalDocs: { description: 'llms.txt', url: info.endpoints.llms },
		tags: [
			{ name: 'Read API', description: 'Static, cacheable JSON documents.' },
			{ name: 'MCP', description: 'Model Context Protocol endpoint for AI agents.' }
		],
		paths,
		components: { schemas }
	};
}
