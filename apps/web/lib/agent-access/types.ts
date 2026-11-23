/**
 * Agent Access Contract v1 — shared with the Ever Works minimal (Astro) template.
 *
 * An agent that learns one Ever Works directory can use all of them: both
 * templates expose the same URLs, JSON shapes and MCP tools. Field names and
 * types here are part of that contract; change them only together with the
 * minimal template (`.specify/features/agent-access.md` there,
 * `docs/spec/069-agent-access/spec.md` here).
 *
 * This module (and everything in `lib/agent-access/` except `server.ts`) is
 * framework-free: no Next.js, no database, no filesystem. It is unit-tested
 * with `tsx --test`.
 */

export const AGENT_ACCESS_VERSION = 1 as const;

/** `generator` value of this template (the minimal template uses `ever-works-minimal`). */
export const AGENT_ACCESS_GENERATOR = 'ever-works' as const;

export interface DirectoryEndpoints {
	items: string;
	/** Template with a literal `{slug}` placeholder. */
	item: string;
	categories: string;
	tags: string;
	openapi: string;
	llms: string;
	llms_full: string;
	sitemap: string;
	/** Absolute URL of the MCP endpoint, or null when the deployment serves none. */
	mcp: string | null;
}

export interface DirectoryCounts {
	items: number;
	categories: number;
	tags: number;
	collections: number;
	comparisons: number;
}

export interface DirectoryInfo {
	version: typeof AGENT_ACCESS_VERSION;
	name: string;
	description: string;
	url: string;
	item_name: string;
	items_name: string;
	counts: DirectoryCounts;
	updated_at: string | null;
	data_repository: string | null;
	submit_url: string | null;
	endpoints: DirectoryEndpoints;
	generator: 'ever-works-minimal' | 'ever-works';
}

export interface ItemSummary {
	slug: string;
	name: string;
	description: string;
	/** Absolute URL of the item page on this directory. */
	url: string;
	/** The item's own website (`source_url`). */
	website: string | null;
	categories: string[];
	category_ids: string[];
	tags: string[];
	tag_ids: string[];
	featured: boolean;
	logo: string | null;
	updated_at: string | null;
}

export interface ItemDetail extends ItemSummary {
	markdown: string | null;
	markdown_url: string;
	images: string[];
	brand: string | null;
	publisher: string | null;
	related: string[];
}

export interface CategoryEntry {
	id: string;
	name: string;
	description: string | null;
	count: number;
	url: string;
}

export interface TagEntry {
	id: string;
	name: string;
	count: number;
	url: string;
}

export interface ItemsDocument {
	version: typeof AGENT_ACCESS_VERSION;
	total: number;
	items: ItemSummary[];
}

export interface CategoriesDocument {
	version: typeof AGENT_ACCESS_VERSION;
	total: number;
	categories: CategoryEntry[];
}

export interface TagsDocument {
	version: typeof AGENT_ACCESS_VERSION;
	total: number;
	tags: TagEntry[];
}

/**
 * Everything the Read API and the MCP server answer from. Built once per
 * content revision by `server.ts`; `getItem` reads the one item's Markdown
 * body lazily (the listing never needs it).
 */
export interface AgentDataset {
	info: DirectoryInfo;
	items: ItemSummary[];
	categories: CategoryEntry[];
	tags: TagEntry[];
	getItem(slug: string): Promise<ItemDetail | null>;
}
