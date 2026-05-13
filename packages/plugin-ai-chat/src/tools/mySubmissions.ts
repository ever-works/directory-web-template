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
		.describe('Maximum number of submissions to return (1–50). Default 20.'),
});

export type MySubmissionsInput = z.infer<typeof inputSchema>;

export const mySubmissionsTool: ChatTool<MySubmissionsInput, ItemSummary[] | AuthRequiredResult> = {
	name: 'mySubmissions',
	description:
		'List the visitor\'s own submitted items (most recent first). Returns the same item summary shape as ' +
		'`searchItems`. Only available to signed-in visitors — refuses with `authentication-required` otherwise.',
	inputSchema,
	requiresAuth: true,
	scenarios: ['my-submissions', 'support', 'navigate'],
	execute: async (input, ctx) => {
		if (!ctx.session) {
			return authRequired(
				'my-submissions',
				'Sign in to see what you have submitted to this directory.',
			);
		}
		return ctx.getMySubmissions(ctx.session.userId, { limit: input.limit });
	},
};
