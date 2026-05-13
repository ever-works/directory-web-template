import { z } from 'zod';
import type { ChatTool } from './tool';
import type { TagSummary } from './types';

const inputSchema = z.object({
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.default(25)
		.describe('Maximum number of tags to return (1–50). Default 25.'),
});

export type ListTagsInput = z.infer<typeof inputSchema>;

export const listTagsTool: ChatTool<ListTagsInput, TagSummary[]> = {
	name: 'listTags',
	description:
		'List the directory tags. Returns tag slugs, names, and item counts. Useful when the visitor asks about ' +
		'cross-cutting themes (e.g. "show me open-source items"). Prefer `listCategories` for top-level groupings.',
	inputSchema,
	requiresAuth: false,
	scenarios: ['browse', 'search', 'support'],
	execute: async (input, ctx) => ctx.listTags({ limit: input.limit }),
};
