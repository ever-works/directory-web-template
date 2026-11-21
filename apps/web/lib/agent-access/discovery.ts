/**
 * Discovery documents of Agent Access Contract v1: the MCP server card
 * (`/.well-known/mcp.json`), the RFC 9727 API catalog
 * (`/.well-known/api-catalog`) and `/llms.txt` (https://llmstxt.org).
 */

import type { CategoryEntry, DirectoryInfo } from './types';
import { MCP_PROTOCOL_VERSIONS, MCP_SERVER_NAME, MCP_SERVER_VERSION, MCP_TOOL_NAMES } from './mcp';
import { relationKey } from './dataset';

export const API_CATALOG_CONTENT_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export interface McpServerCard {
	name: string;
	title: string;
	description: string;
	version: string;
	url: string;
	transport: 'streamable-http';
	protocolVersions: string[];
	authentication: 'none';
	tools: string[];
	documentation: string;
	openapi: string;
}

/** `/.well-known/mcp.json`; null when the deployment serves no `/mcp` (then the route answers 404). */
export function buildMcpServerCard(info: DirectoryInfo): McpServerCard | null {
	if (!info.endpoints.mcp) return null;
	return {
		name: MCP_SERVER_NAME,
		title: info.name,
		description: info.description,
		version: MCP_SERVER_VERSION,
		url: info.endpoints.mcp,
		transport: 'streamable-http',
		protocolVersions: [...MCP_PROTOCOL_VERSIONS],
		authentication: 'none',
		tools: [...MCP_TOOL_NAMES],
		documentation: info.endpoints.llms,
		openapi: info.endpoints.openapi
	};
}

/**
 * `/.well-known/api-catalog` (RFC 9727): one linkset entry anchored at the Read
 * API root; `service-meta` points at the MCP server card when there is one.
 */
export function buildApiCatalog(info: DirectoryInfo): { linkset: Array<Record<string, unknown>> } {
	return {
		linkset: [
			{
				anchor: `${info.url}/data/`,
				'service-desc': [{ href: info.endpoints.openapi, type: 'application/openapi+json' }],
				'service-doc': [{ href: info.endpoints.llms, type: 'text/plain' }],
				...(info.endpoints.mcp
					? { 'service-meta': [{ href: info.url + '/.well-known/mcp.json', type: 'application/json' }] }
					: {})
			}
		]
	};
}

/** Key used in the ready-to-paste MCP client configuration. */
export function mcpClientKey(info: DirectoryInfo): string {
	return relationKey(info.name).replace(/[^a-z0-9-]/g, '') || MCP_SERVER_NAME;
}

/**
 * Ready-to-paste `mcpServers` entry for clients that take a remote (HTTP)
 * server in their configuration file (Cursor, VS Code, Windsurf). Claude
 * (desktop and web) adds the URL as a custom connector instead: its desktop
 * configuration file only launches local servers.
 */
export function mcpClientConfig(info: DirectoryInfo): string | null {
	if (!info.endpoints.mcp) return null;
	return JSON.stringify({ mcpServers: { [mcpClientKey(info)]: { type: 'http', url: info.endpoints.mcp } } }, null, 2);
}

export interface LlmsTxtInput {
	info: DirectoryInfo;
	categories: ReadonlyArray<CategoryEntry>;
	/** Whether category pages exist (`settings.categories_enabled`). */
	categoriesEnabled?: boolean;
	/** Cap on listed categories so a huge taxonomy does not bloat the index. */
	maxCategories?: number;
}

function oneLine(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

/** `/llms.txt`: summary, how to query (Read API, MCP, OpenAPI), categories, Markdown mirrors, feeds. */
export function buildLlmsTxt({ info, categories, categoriesEnabled = true, maxCategories = 200 }: LlmsTxtInput): string {
	const base = info.url;
	const items = info.items_name.toLowerCase();
	const lines: string[] = [`# ${info.name}`, '', `> ${oneLine(info.description)}`, ''];

	lines.push(
		`${info.name} lists ${info.counts.items} ${items}` +
			(info.counts.categories ? ` in ${info.counts.categories} categories` : '') +
			(info.counts.tags ? `, with ${info.counts.tags} tags` : '') +
			`. Everything below is public and read-only; no account or API key is needed.`,
		''
	);

	lines.push(
		'## How to query this directory',
		'',
		`- [Directory info](${base}/data/directory.json): name, description, counts, last update and every endpoint below, as JSON.`,
		`- [All ${items}](${info.endpoints.items}): every ${info.item_name.toLowerCase()} with its URL, website, categories, tags and logo (JSON).`,
		`- One ${info.item_name.toLowerCase()}: \`${info.endpoints.item}\` (JSON with the full Markdown description and related ${items}).`,
		`- [Categories](${info.endpoints.categories}) and [tags](${info.endpoints.tags}) with item counts (JSON).`,
		`- [OpenAPI 3.1 description](${info.endpoints.openapi}) of the Read API${info.endpoints.mcp ? ' and the MCP endpoint' : ''}.`
	);
	if (info.endpoints.mcp) {
		const tools = MCP_TOOL_NAMES.map((name) => `\`${name}\``).join(', ');
		lines.push(
			`- [MCP server](${info.endpoints.mcp}): Model Context Protocol, Streamable HTTP transport (stateless, JSON responses). Tools: ${tools}. Server card: ${base}/.well-known/mcp.json.`,
			'',
			'### Connect an MCP client',
			'',
			'Clients that take a remote (HTTP) server in their configuration file (Cursor, VS Code, Windsurf, …):',
			'',
			'```json',
			mcpClientConfig(info) ?? '',
			'```',
			'',
			`- Claude Code: \`claude mcp add --transport http ${mcpClientKey(info)} ${info.endpoints.mcp}\``,
			`- Claude (desktop and web): Settings > Connectors > Add custom connector, URL \`${info.endpoints.mcp}\` (the desktop configuration file only launches local servers).`
		);
	}
	lines.push('');

	const listed = categoriesEnabled ? categories.filter((category) => category.count > 0).slice(0, maxCategories) : [];
	if (listed.length > 0) {
		lines.push('## Categories', '');
		for (const category of listed) {
			const description = category.description ? `: ${oneLine(category.description)}` : '';
			lines.push(`- [${category.name}](${category.url}) (${category.count})${description}`);
		}
		if (categories.length > listed.length && categoriesEnabled) {
			lines.push(`- All categories: ${info.endpoints.categories}`);
		}
		lines.push('');
	}

	lines.push(
		'## Canonical data',
		'',
		`- [Full long-form Markdown dump](${info.endpoints.llms_full}): every category, tag, ${info.item_name.toLowerCase()} and comparison as Markdown for one-shot ingestion.`,
		`- [Legacy items index](${base}/items.json): the earlier JSON shape, kept for existing integrations.`,
		`- [Sitemap](${info.endpoints.sitemap})`,
		'',
		'## Markdown mirrors',
		'',
		'Every public page also serves a clean Markdown twin at the same path with `.md` appended:',
		'',
		`- ${base}/items/<slug>.md`,
		`- ${base}/categories/<id>.md`,
		`- ${base}/tags/<id>.md`,
		`- ${base}/collections/<slug>.md`,
		`- ${base}/comparisons/<slug>.md`,
		`- ${base}/pages/<slug>.md`,
		`- ${base}/about.md, ${base}/help.md, ${base}/faq.md, ${base}/pricing.md, ${base}/privacy-policy.md, ${base}/terms-of-service.md, ${base}/cookies.md`,
		'',
		'Each HTML page advertises its mirror via `<link rel="alternate" type="text/markdown" href="…">`.',
		'',
		'## Feeds',
		'',
		`- [JSON Feed 1.1](${base}/feed.json)`,
		`- [Atom](${base}/atom.xml)`,
		`- [RSS 2.0](${base}/rss.xml)`,
		''
	);

	if (info.submit_url) {
		lines.push('## Contribute', '', `- [Submit a ${info.item_name.toLowerCase()}](${info.submit_url})`, '');
	}

	lines.push(
		'## About',
		'',
		`This site was generated by the [Ever Works](https://ever.works) platform. Agents that want to build their own directory can use the zero-friction onboarding endpoint at \`https://api.ever.works/api/register-work\` — see https://docs.ever.works/agent-services/zero-friction-onboarding for details.`,
		''
	);

	return lines.join('\n');
}
