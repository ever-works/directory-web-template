/**
 * `@ever-works/plugin-ai-chat` — AI chat plugin for the Directory
 * Web Template.
 *
 * See `docs/spec/023-ai-chat/` for the spec, plan, and tasks.
 */

export const PLUGIN_NAME = 'plugin-ai-chat' as const;
export const PLUGIN_VERSION = '0.1.0' as const;

// Config
export {
	AiChatConfigSchema,
	ANONYMOUS_SCENARIOS,
	AUTHENTICATED_EXTRA_SCENARIOS,
	AUTHENTICATED_SCENARIOS,
	CHAT_POSITIONS,
	DEFAULT_AI_CHAT_CONFIG,
	parseAiChatConfig,
	SHIPPED_LOCALES,
	type AiChatConfig,
	type AnonymousScenario,
	type AuthenticatedExtraScenario,
	type AuthenticatedScenario,
	type ChatPosition
} from './config';

// Tools
export {
	ALL_CHAT_TOOLS,
	createTools,
	getItemDetailsTool,
	listCategoriesTool,
	listTagsTool,
	myFavouritesTool,
	myProfileTool,
	mySubmissionsTool,
	navigateTool,
	searchItemsTool,
	type AiChatToolContext,
	type AuthRequiredResult,
	type CategorySummary,
	type ChatSession,
	type ChatTool,
	type CreateToolsOptions,
	type ItemDetail,
	type ItemSummary,
	type NavigateResult,
	type TagSummary,
	type UserProfileSummary
} from './tools';

// Prompts
export {
	buildSystemPrompt,
	DEFAULT_ANONYMOUS_TEMPLATE,
	DEFAULT_AUTHENTICATED_TEMPLATE,
	DEFAULT_PROMPT_TEMPLATES,
	sanitiseForPrompt,
	type AiChatPromptTemplates,
	type BuildSystemPromptInput
} from './prompts';

// Agent
export { DEFAULT_MAX_STEPS, DEFAULT_MESSAGE_LIMITS, runAgent, type RunAgentParams, type RunAgentResult } from './agent';
