import { z } from 'zod';
import type { ChatTool } from './tool';
import type { ItemSummary } from './types';

const inputSchema = z.object({
	query: z
		.string()
		.min(1, 'query is required')
		.max(200, 'query is too long')
		.describe('A free-text search query (item name, keywords, category hints).'),
	limit: z.number().int().min(1).max(20).default(5).describe('Maximum number of items to return (1–20). Default 5.')
});

export type SearchItemsInput = z.infer<typeof inputSchema>;

export const searchItemsTool: ChatTool<SearchItemsInput, ItemSummary[]> = {
	name: 'searchItems',
	description:
		'Search the directory for items matching a free-text query. Returns a short list of items with name, slug, ' +
		'tagline, and category. Use this whenever the visitor asks to find, look up, or browse items.',
	inputSchema,
	requiresAuth: false,
	scenarios: ['browse', 'search', 'submit', 'support', 'navigate'],
	execute: async (input, ctx) => ctx.searchItems({ query: input.query, limit: input.limit })
};
