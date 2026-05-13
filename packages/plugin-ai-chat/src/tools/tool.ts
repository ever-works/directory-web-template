import type { z } from 'zod';
import type { AuthenticatedScenario } from '../config';
import type { AiChatToolContext } from './context';

/**
 * Internal tool descriptor used by the plugin. A slight superset of
 * Vercel AI SDK's `Tool` shape — adds `requiresAuth` and `scenarios`
 * metadata that the agent (T-004) uses to filter which tools the
 * model is allowed to call for a given visitor / scenario.
 *
 * `createTools(ctx, opts)` in `./index.ts` converts these to the
 * exact shape `streamText({ tools })` expects.
 */
export interface ChatTool<TInput, TOutput> {
	/** Stable internal name (also used as the model-facing tool name). */
	readonly name: string;

	/** Description shown to the model. Keep concise and action-oriented. */
	readonly description: string;

	/** Zod schema for the tool's input. */
	readonly inputSchema: z.ZodType<TInput>;

	/** When true, this tool is omitted from the tool set for anonymous visitors. */
	readonly requiresAuth: boolean;

	/**
	 * Scenarios that allow this tool. When the active scenario is not
	 * in this list, the tool is omitted. Use a `'*'` sentinel via the
	 * helper below if the tool is scenario-agnostic.
	 */
	readonly scenarios: ReadonlyArray<AuthenticatedScenario | '*'>;

	/** The actual call — receives the validated input plus the context. */
	execute(input: TInput, ctx: AiChatToolContext): Promise<TOutput>;
}

/**
 * Helper sentinel: a tool whose `scenarios` array contains `'*'` is
 * available under every enabled scenario.
 */
export const ANY_SCENARIO = '*' as const;

export function isAvailableInScenario(tool: ChatTool<unknown, unknown>, scenario: AuthenticatedScenario): boolean {
	return tool.scenarios.includes(ANY_SCENARIO) || tool.scenarios.includes(scenario);
}
