import { z } from 'zod';
import type { ChatTool } from './tool';
import type { ItemDetail } from './types';

const inputSchema = z.object({
	slug: z
		.string()
		.min(1, 'slug is required')
		.max(200)
		.describe('The slug of the item to look up (typically obtained from `searchItems`).')
});

export type GetItemDetailsInput = z.infer<typeof inputSchema>;

export const getItemDetailsTool: ChatTool<GetItemDetailsInput, ItemDetail | null> = {
	name: 'getItemDetails',
	description:
		'Fetch full details for a single item by slug — description, website, price model, category, and tags. ' +
		'Call this after `searchItems` when the visitor wants more information about a specific item.',
	inputSchema,
	requiresAuth: false,
	scenarios: ['browse', 'search', 'support', 'navigate'],
	execute: async (input, ctx) => ctx.getItem(input.slug)
};
