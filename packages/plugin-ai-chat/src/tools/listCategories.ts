import { z } from 'zod';
import type { ChatTool } from './tool';
import type { CategorySummary } from './types';

const inputSchema = z.object({
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.default(25)
		.describe('Maximum number of categories to return (1–50). Default 25.'),
});

export type ListCategoriesInput = z.infer<typeof inputSchema>;

export const listCategoriesTool: ChatTool<ListCategoriesInput, CategorySummary[]> = {
	name: 'listCategories',
	description:
		'List the directory categories so the visitor can narrow their search. Returns category slugs, names, and ' +
		'item counts. Useful when the visitor asks "what categories exist?" or "what kinds of items are here?".',
	inputSchema,
	requiresAuth: false,
	scenarios: ['browse', 'search', 'submit', 'support'],
	execute: async (input, ctx) => ctx.listCategories({ limit: input.limit }),
};
