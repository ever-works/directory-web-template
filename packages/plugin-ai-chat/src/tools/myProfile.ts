import { z } from 'zod';
import type { ChatTool } from './tool';
import { authRequired, type AuthRequiredResult, type UserProfileSummary } from './types';

const inputSchema = z.object({}).strict();

export type MyProfileInput = z.infer<typeof inputSchema>;

export const myProfileTool: ChatTool<
	MyProfileInput,
	UserProfileSummary | AuthRequiredResult | null
> = {
	name: 'myProfile',
	description:
		'Fetch a short summary of the visitor\'s own profile — display name, avatar, submission and favourite ' +
		'counts, and profile completeness. Use this to answer "who am I in this directory?" or to nudge the ' +
		'visitor to complete missing fields. Only available to signed-in visitors.',
	inputSchema,
	requiresAuth: true,
	scenarios: ['my-profile', 'support', 'navigate'],
	execute: async (_input, ctx) => {
		if (!ctx.session) {
			return authRequired(
				'my-profile',
				'Sign in to see your directory profile.',
			);
		}
		return ctx.getMyProfile(ctx.session.userId);
	},
};
