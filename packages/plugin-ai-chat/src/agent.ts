import { convertToModelMessages, stepCountIs, streamText, type LanguageModel, type UIMessage } from 'ai';

type StreamTextResultDefault = ReturnType<typeof streamText>;
import type { AuthenticatedScenario } from './config';
import { buildSystemPrompt, DEFAULT_PROMPT_TEMPLATES, type AiChatPromptTemplates } from './prompts';
import type { AiChatToolContext } from './tools/context';
import { createTools } from './tools';

/**
 * Hard cap on the number of agent steps (i.e. model calls + tool
 * round-trips) per /api/chat request. Keeps cost and tail-latency
 * predictable; raise the limit per-deployment via
 * `RunAgentParams.maxSteps`.
 */
export const DEFAULT_MAX_STEPS = 5;

/**
 * Default upper bounds applied to incoming UI messages before they
 * are converted to model messages. These match the values quoted in
 * spec 023 §8 ("Input validation"). The API route is expected to
 * enforce them too; doing it here is belt-and-braces.
 */
export const DEFAULT_MESSAGE_LIMITS = {
	maxMessages: 50,
	maxCharsPerMessage: 4000
} as const;

export interface RunAgentParams {
	/** Raw UI messages received from the chat client. */
	uiMessages: ReadonlyArray<UIMessage>;

	/**
	 * The model instance the operator's provider produced. The route
	 * (`/api/chat`, T-007) builds this with `createOpenAICompatible`
	 * + `AI_CHAT_API_KEY` + `AI_CHAT_MODEL`.
	 */
	model: LanguageModel;

	/** Tool dependency-injection context (see `./tools/context.ts`). */
	ctx: AiChatToolContext;

	/** Active scenario for this conversation. */
	scenario: AuthenticatedScenario;

	/**
	 * Optional allow-list narrowing the tool set further (typically
	 * built from `aiChat.{anonymous|authenticated}.scenarios`). When
	 * omitted, every tool the scenario allows is registered.
	 */
	allow?: ReadonlySet<string>;

	/** Localised prompt templates. Defaults to the bundled English ones. */
	templates?: AiChatPromptTemplates;

	/** Directory display name (from `works.yml`). Interpolated into the prompt. */
	directoryName: string;

	/**
	 * The URL the visitor is currently viewing, if known. Sanitised
	 * before interpolation. Pass `null` for the home page / unknown.
	 */
	currentPageUrl?: string | null;

	/** Stop condition. Defaults to `stepCountIs(DEFAULT_MAX_STEPS)`. */
	maxSteps?: number;

	/** Optional abort signal piped into `streamText`. */
	abortSignal?: AbortSignal;
}

/**
 * Truncates each user-authored message's text content to
 * `maxCharsPerMessage`, drops everything past `maxMessages` from the
 * tail of the history, and returns the resulting array. Tool
 * messages and assistant replies are preserved untouched so we
 * don't break the model's chain-of-thought.
 */
function clampUiMessages(messages: ReadonlyArray<UIMessage>, limits = DEFAULT_MESSAGE_LIMITS): UIMessage[] {
	const truncated = messages.map((m) => {
		if (m.role !== 'user') return m;
		const parts = m.parts.map((p) => {
			if (p.type !== 'text') return p;
			if (p.text.length <= limits.maxCharsPerMessage) return p;
			return { ...p, text: p.text.slice(0, limits.maxCharsPerMessage) };
		});
		return { ...m, parts } as UIMessage;
	});
	if (truncated.length <= limits.maxMessages) return truncated;
	return truncated.slice(truncated.length - limits.maxMessages);
}

export interface RunAgentResult {
	/**
	 * The `streamText` result; the route handler typically calls
	 * `.toUIMessageStreamResponse()` on it to produce the HTTP
	 * response.
	 */
	stream: StreamTextResultDefault;
	/**
	 * The fully assembled system prompt (useful for logging /
	 * debugging — never return this to the client).
	 */
	systemPrompt: string;
	/** The model-ready messages after conversion + clamping. */
	modelMessageCount: number;
	/** The names of the tools the model is allowed to call. */
	toolNames: ReadonlyArray<string>;
}

/**
 * The plugin's main entry point. The route (`/api/chat`, T-007)
 * calls this once per chat request and forwards the result through
 * `.toUIMessageStreamResponse()`.
 *
 * Responsibilities (kept narrow on purpose):
 *   1. Build the per-request tool set from `ctx` + `scenario`
 *      + `allow`.
 *   2. Build the system prompt from the templates + variables.
 *   3. Clamp message history to sensible bounds.
 *   4. Hand off to `streamText`.
 *
 * The route owns:
 *   - request body validation (zod),
 *   - session resolution,
 *   - rate limiting,
 *   - persistence (`onFinish` callback),
 *   - error mapping.
 */
export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
	const templates = params.templates ?? DEFAULT_PROMPT_TEMPLATES;
	const tools = createTools(params.ctx, { scenario: params.scenario, allow: params.allow });
	const toolNames = Object.keys(tools);

	const systemPrompt = buildSystemPrompt({
		templates,
		directoryName: params.directoryName,
		locale: params.ctx.locale,
		scenario: params.scenario,
		session: params.ctx.session,
		currentPageUrl: params.currentPageUrl ?? null,
		toolNames
	});

	const clamped = clampUiMessages(params.uiMessages);
	const modelMessages = await convertToModelMessages(clamped);

	const stream = streamText({
		model: params.model,
		messages: modelMessages,
		system: systemPrompt,
		tools,
		stopWhen: stepCountIs(params.maxSteps ?? DEFAULT_MAX_STEPS),
		abortSignal: params.abortSignal
	});

	return {
		stream,
		systemPrompt,
		modelMessageCount: modelMessages.length,
		toolNames
	};
}
