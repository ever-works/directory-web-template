import { z } from 'zod';
import type { ChatTool } from './tool';

const KNOWN_TARGETS = [
	'home',
	'submit',
	'pricing',
	'sign-in',
	'sign-up',
	'favorites',
	'dashboard',
	'item',
	'category',
	'tag',
	'search',
] as const;

const inputSchema = z.object({
	target: z
		.enum(KNOWN_TARGETS)
		.describe('Which directory page to take the visitor to.'),
	slug: z
		.string()
		.min(1)
		.max(200)
		.optional()
		.describe(
			'Slug parameter for targets that need one (`item`, `category`, `tag`). Ignored otherwise.',
		),
	query: z
		.string()
		.max(200)
		.optional()
		.describe('Pre-fill query string for the `search` target. Ignored otherwise.'),
});

export type NavigateInput = z.infer<typeof inputSchema>;

export interface NavigateResult {
	/** Locale-relative path the client should `router.push()` after the stream completes. */
	path: string;
	/** The locale the chat is operating under (echoed back so the client can prefix correctly). */
	locale: string;
}

function buildPath(input: NavigateInput): string {
	switch (input.target) {
		case 'home':
			return '/';
		case 'submit':
			return '/submit';
		case 'pricing':
			return '/pricing';
		case 'sign-in':
			return '/auth/sign-in';
		case 'sign-up':
			return '/auth/sign-up';
		case 'favorites':
			return '/favorites';
		case 'dashboard':
			return '/dashboard';
		case 'item':
			return input.slug ? `/items/${encodeURIComponent(input.slug)}` : '/items';
		case 'category':
			return input.slug ? `/categories/${encodeURIComponent(input.slug)}` : '/categories';
		case 'tag':
			return input.slug ? `/tags/${encodeURIComponent(input.slug)}` : '/tags';
		case 'search':
			return input.query
				? `/?q=${encodeURIComponent(input.query)}`
				: '/';
	}
}

export const navigateTool: ChatTool<NavigateInput, NavigateResult> = {
	name: 'navigate',
	description:
		'Take the visitor to a directory page (home, submit, pricing, sign-in, an item, a category, a tag, etc.). ' +
		'Returns a path the client will `router.push()` after the assistant\'s reply finishes streaming. ' +
		'Use this whenever the visitor asks "take me to…" or "open the submission form".',
	inputSchema,
	requiresAuth: false,
	scenarios: ['browse', 'search', 'submit', 'pricing', 'login-help', 'navigate', 'support'],
	execute: async (input, ctx) => ({
		path: buildPath(input),
		locale: ctx.locale,
	}),
};
