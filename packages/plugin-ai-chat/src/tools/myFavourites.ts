import { z } from 'zod';
import type { ChatTool } from './tool';
import { authRequired, type AuthRequiredResult, type ItemSummary } from './types';

const inputSchema = z.object({
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.default(20)
		.describe('Maximum number of favourites to return (1–50). Default 20.'),
});

export type MyFavouritesInput = z.infer<typeof inputSchema>;

export const myFavouritesTool: ChatTool<MyFavouritesInput, ItemSummary[] | AuthRequiredResult> = {
	name: 'myFavourites',
	description:
		'List the items the visitor has favourited (most recent first). Returns the same item summary shape as ' +
		'`searchItems`. Only available to signed-in visitors — refuses with `authentication-required` otherwise.',
	inputSchema,
	requiresAuth: true,
	scenarios: ['my-favourites', 'support', 'navigate'],
	execute: async (input, ctx) => {
		if (!ctx.session) {
			return authRequired(
				'my-favourites',
				'Sign in to see the items you have favourited.',
			);
		}
		return ctx.getMyFavourites(ctx.session.userId, { limit: input.limit });
	},
};
