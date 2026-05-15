import { tool, type Tool, type ToolSet } from 'ai';
import type { AuthenticatedScenario } from '../config';
import type { AiChatToolContext } from './context';
import { isAvailableInScenario, type ChatTool } from './tool';

import { getItemDetailsTool } from './getItemDetails';
import { listCategoriesTool } from './listCategories';
import { listTagsTool } from './listTags';
import { myFavouritesTool } from './myFavourites';
import { myProfileTool } from './myProfile';
import { mySubmissionsTool } from './mySubmissions';
import { navigateTool } from './navigate';
import { searchItemsTool } from './searchItems';

/**
 * The full set of chat tools the plugin ships. Order is presentation
 * order — model-facing tool listings tend to give earlier entries
 * slightly more weight, so anonymous / discovery tools come first.
 */
export const ALL_CHAT_TOOLS: ReadonlyArray<ChatTool<unknown, unknown>> = [
	searchItemsTool as ChatTool<unknown, unknown>,
	getItemDetailsTool as ChatTool<unknown, unknown>,
	listCategoriesTool as ChatTool<unknown, unknown>,
	listTagsTool as ChatTool<unknown, unknown>,
	navigateTool as ChatTool<unknown, unknown>,
	mySubmissionsTool as ChatTool<unknown, unknown>,
	myFavouritesTool as ChatTool<unknown, unknown>,
	myProfileTool as ChatTool<unknown, unknown>
];

export interface CreateToolsOptions {
	/** The active scenario for this conversation. */
	scenario: AuthenticatedScenario;
	/**
	 * Optional override of the tool whitelist. When omitted, every
	 * tool the scenario allows is registered. The runtime
	 * (`runAgent`, T-004) uses this to honour the `aiChat.{anonymous |
	 * authenticated}.scenarios` config — e.g. if `submit` is removed
	 * from `anonymous.scenarios`, the navigate tool's `submit` target
	 * stays available but the submit-flow opener does not.
	 */
	allow?: ReadonlySet<string>;
}

/**
 * Builds a Vercel-AI-SDK `ToolSet` for a single chat invocation by
 * filtering `ALL_CHAT_TOOLS` against the session + scenario + allow
 * list and binding each surviving tool's `execute` closure to the
 * provided `AiChatToolContext`.
 *
 * Filters applied (in order):
 *   1. `requiresAuth=true` tools are dropped when `ctx.session === null`.
 *   2. Tools whose `scenarios` does not include the active scenario
 *      (or `'*'`) are dropped.
 *   3. If `opts.allow` is provided, tools whose name is not in the
 *      set are dropped.
 */
export function createTools(ctx: AiChatToolContext, opts: CreateToolsOptions): ToolSet {
	const set: Record<string, Tool> = {};

	for (const t of ALL_CHAT_TOOLS) {
		if (t.requiresAuth && ctx.session === null) continue;
		if (!isAvailableInScenario(t, opts.scenario)) continue;
		if (opts.allow && !opts.allow.has(t.name)) continue;

		set[t.name] = tool({
			description: t.description,
			inputSchema: t.inputSchema,
			execute: (input) => t.execute(input, ctx) as Promise<unknown>
		});
	}

	return set;
}

export type { ChatTool } from './tool';
export type { AiChatToolContext } from './context';
export type {
	AuthRequiredResult,
	CategorySummary,
	ChatSession,
	ItemDetail,
	ItemSummary,
	TagSummary,
	UserProfileSummary
} from './types';

export { getItemDetailsTool } from './getItemDetails';
export { listCategoriesTool } from './listCategories';
export { listTagsTool } from './listTags';
export { myFavouritesTool } from './myFavourites';
export { myProfileTool } from './myProfile';
export { mySubmissionsTool } from './mySubmissions';
export { navigateTool, type NavigateResult } from './navigate';
export { searchItemsTool } from './searchItems';
