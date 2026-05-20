import { NextResponse, type NextRequest } from 'next/server';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { z } from 'zod';
import {
	parseAiChatConfig,
	runAgent,
	type AiChatConfig,
	type AuthenticatedScenario,
	type ChatSession
} from '@ever-works/plugin-ai-chat';
import type { UIMessage } from 'ai';
import { auth } from '@/lib/auth';
import { configManager } from '@/lib/config-manager';
import { ratelimit } from '@/lib/utils/rate-limit';
import { buildAiChatToolContext } from '@/lib/services/chat-context.service';
import { appendMessages, createConversation, requireOwnership } from '@/lib/repositories/chat.repository';
import {
	AI_CHAT_TEST_OVERRIDE_COOKIE,
	applyAiChatTestOverride,
	isAiChatTestOverrideCookie
} from '@/lib/services/ai-chat-test-overrides';

/**
 * POST /api/chat — streaming chat completions for the directory's
 * AI assistant. See `docs/spec/023-ai-chat/` for the full contract.
 *
 * Responsibilities of this handler (kept thin per CLAUDE.md §6):
 *   1. Validate the request body with Zod.
 *   2. Look up `aiChat.enabled` in `works.yml` → 404 if disabled.
 *   3. Resolve the Auth.js session (if any).
 *   4. Apply per-IP / per-user rate limiting via the existing
 *      `lib/utils/rate-limit.ts` helper.
 *   5. Construct the OpenAI-compatible provider + the
 *      `AiChatToolContext` from this app's repositories.
 *   6. Dispatch to `runAgent` from `@ever-works/plugin-ai-chat`
 *      and stream the result via `toUIMessageStreamResponse()`.
 *
 * Persistence (`aiChat.persist=true`) lands in T-008 via the
 * `onFinish` callback on the returned stream response.
 */

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const ALLOWED_SCENARIOS = [
	'browse',
	'search',
	'submit',
	'pricing',
	'login-help',
	'support',
	'my-submissions',
	'my-favourites',
	'my-profile',
	'navigate'
] as const satisfies ReadonlyArray<AuthenticatedScenario>;

const RequestSchema = z.object({
	messages: z
		.array(z.unknown())
		.min(1, 'at least one message is required')
		.max(50, 'message history is capped at 50 entries'),
	conversationId: z.string().min(1).max(64).optional(),
	scenario: z.enum(ALLOWED_SCENARIOS).optional(),
	currentPageUrl: z.string().max(2048).optional().nullable(),
	locale: z.string().min(2).max(16).optional()
});

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------

interface RateLimitConfig {
	limit: number;
	windowMs: number;
}

function readPositiveInt(envValue: string | undefined, fallback: number): number {
	if (!envValue) return fallback;
	const parsed = Number.parseInt(envValue, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRateLimitConfig(): { anon: RateLimitConfig; auth: RateLimitConfig } {
	return {
		anon: {
			limit: readPositiveInt(process.env.AI_CHAT_RATE_LIMIT_ANON, 20),
			windowMs: 60_000
		},
		auth: {
			limit: readPositiveInt(process.env.AI_CHAT_RATE_LIMIT_AUTH, 60),
			windowMs: 60_000
		}
	};
}

function resolveClientIp(request: NextRequest): string {
	return (
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
	);
}

// ---------------------------------------------------------------------------
// Provider construction
// ---------------------------------------------------------------------------

interface ChatProviderEnv {
	baseUrl: string;
	apiKey: string;
	modelId: string;
	name: string;
}

function readProviderEnv(config: AiChatConfig): ChatProviderEnv | null {
	const apiKey = process.env.AI_CHAT_API_KEY;
	if (!apiKey) return null;
	const baseUrl = process.env.AI_CHAT_BASE_URL ?? 'https://openrouter.ai/api/v1';
	const modelId = process.env.AI_CHAT_MODEL ?? config.model;
	const name = process.env.AI_CHAT_PROVIDER ?? config.provider;
	return { baseUrl, apiKey, modelId, name };
}

// ---------------------------------------------------------------------------
// Session adapter
// ---------------------------------------------------------------------------

interface MinimalAuthUser {
	id?: string;
	email?: string | null;
	name?: string | null;
	tenantId?: string;
}

function sessionToChatSession(user: MinimalAuthUser | undefined, locale: string): ChatSession | null {
	if (!user?.id) return null;
	return {
		userId: user.id,
		email: user.email ?? null,
		displayName: user.name ?? null,
		locale,
		tenantId: user.tenantId ?? null
	};
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
	try {
		return await handlePost(request);
	} catch (error) {
		// Any unhandled error (config singleton init, plugin import,
		// etc.) degrades to the documented 503 "chat unavailable"
		// envelope — the same status the explicit provider-not-configured
		// branch returns, so external probes see one consistent
		// unavailability code rather than a leaked 500.
		console.error('[/api/chat] unexpected error:', error);
		return NextResponse.json({ error: 'chat-temporarily-unavailable' }, { status: 503 });
	}
}

async function handlePost(request: NextRequest) {
	// 1. Validate request body.
	let parsed: z.infer<typeof RequestSchema>;
	try {
		const body = await request.json();
		const result = RequestSchema.safeParse(body);
		if (!result.success) {
			return NextResponse.json({ error: 'invalid-request', issues: result.error.issues }, { status: 400 });
		}
		parsed = result.data;
	} catch {
		return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
	}

	// 2. Load works.yml config and check enabled flag.
	const appConfig = configManager.getConfig();
	const configParse = parseAiChatConfig(appConfig.aiChat);
	if (!configParse.ok) {
		// Misconfigured operator: don't 200, don't 500, don't leak schema errors —
		// chat is effectively disabled until the YAML is corrected.
		return NextResponse.json({ error: 'not-found' }, { status: 404 });
	}
	const overrideActive = isAiChatTestOverrideCookie(request.cookies.get(AI_CHAT_TEST_OVERRIDE_COOKIE)?.value);
	const chatConfig = applyAiChatTestOverride(configParse.config, overrideActive);
	if (!chatConfig.enabled) {
		return NextResponse.json({ error: 'not-found' }, { status: 404 });
	}

	// 3. Resolve session.
	const session = await auth();
	const locale = parsed.locale ?? chatConfig.defaultLocale;
	const chatSession = sessionToChatSession(session?.user, locale);

	// 4. Scenario gating against works.yml allow-list.
	const scenario: AuthenticatedScenario = parsed.scenario ?? (chatSession ? 'browse' : 'browse');
	const persona = chatSession ? chatConfig.authenticated : chatConfig.anonymous;
	if (!persona.enabled) {
		return NextResponse.json({ error: 'chat-disabled-for-persona' }, { status: 403 });
	}
	if (!persona.scenarios.includes(scenario as never)) {
		return NextResponse.json({ error: 'scenario-not-allowed', scenario }, { status: 403 });
	}
	// Tools that require auth are also gated by the plugin's createTools.
	if (!chatSession && ['my-submissions', 'my-favourites', 'my-profile'].includes(scenario)) {
		return NextResponse.json({ error: 'authentication-required' }, { status: 401 });
	}

	// 5. Rate limit.
	const limits = getRateLimitConfig();
	const rateLimitKey = chatSession ? `chat:user:${chatSession.userId}` : `chat:ip:${resolveClientIp(request)}`;
	const rateConfig = chatSession ? limits.auth : limits.anon;
	const rl = await ratelimit(rateLimitKey, rateConfig.limit, rateConfig.windowMs);
	if (!rl.success) {
		const retryAfterSeconds = Math.max(1, Math.ceil((rl.retryAfter ?? rateConfig.windowMs) / 1000));
		return NextResponse.json(
			{ error: 'rate-limited', retryAfter: retryAfterSeconds },
			{
				status: 429,
				headers: { 'Retry-After': String(retryAfterSeconds) }
			}
		);
	}

	// 6. Resolve provider.
	const providerEnv = readProviderEnv(chatConfig);
	if (!providerEnv) {
		console.error('[/api/chat] AI_CHAT_API_KEY is not set; chat is enabled but unusable.');
		return NextResponse.json({ error: 'provider-not-configured' }, { status: 503 });
	}
	const provider = createOpenAICompatible({
		name: providerEnv.name,
		baseURL: providerEnv.baseUrl,
		apiKey: providerEnv.apiKey
	});

	// 7. Build the tool context + run the agent.
	const directoryName = typeof appConfig.name === 'string' ? appConfig.name : 'this directory';
	const ctx = buildAiChatToolContext({
		locale,
		session: chatSession
	});

	let agentResult;
	try {
		agentResult = await runAgent({
			uiMessages: parsed.messages as ReadonlyArray<UIMessage>,
			model: provider(providerEnv.modelId),
			ctx,
			scenario,
			allow: new Set(persona.scenarios),
			directoryName,
			currentPageUrl: parsed.currentPageUrl ?? null,
			abortSignal: request.signal
		});
	} catch (error) {
		console.error('[/api/chat] runAgent failed:', error);
		return NextResponse.json({ error: 'agent-failed' }, { status: 502 });
	}

	// 8. Optional persistence: when `aiChat.persist === true` AND the visitor
	//    is signed in, ensure a conversation row exists and append the new
	//    messages after the stream finishes. Errors here are logged and
	//    swallowed so a DB hiccup never breaks the user-facing stream.
	const persistenceContext =
		chatConfig.persist && chatSession
			? await resolveConversationForPersistence({
					session: chatSession,
					locale,
					scenario,
					conversationId: parsed.conversationId
				}).catch((error) => {
					console.error('[/api/chat] persistence pre-flight failed:', error);
					return null;
				})
			: null;

	// 9. Stream back to the client.
	return agentResult.stream.toUIMessageStreamResponse({
		onFinish: persistenceContext
			? async ({ messages: finalMessages }) => {
					try {
						await persistChatTurn(persistenceContext.conversationId, parsed.messages, finalMessages);
					} catch (error) {
						console.error('[/api/chat] onFinish persistence failed:', error);
					}
				}
			: undefined
	});
}

interface PersistenceContext {
	conversationId: string;
}

async function resolveConversationForPersistence(input: {
	session: ChatSession;
	locale: string;
	scenario: AuthenticatedScenario;
	conversationId?: string;
}): Promise<PersistenceContext> {
	if (input.conversationId) {
		const owned = await requireOwnership(input.session.userId, input.conversationId);
		if (owned) return { conversationId: owned.id };
	}
	const created = await createConversation({
		userId: input.session.userId,
		locale: input.locale,
		scenario: input.scenario
	});
	return { conversationId: created.id };
}

interface PersistableMessage {
	role: string;
	parts?: unknown;
}

async function persistChatTurn(
	conversationId: string,
	clientMessages: ReadonlyArray<unknown>,
	finalMessages: ReadonlyArray<unknown>
): Promise<void> {
	// Persist the LAST user message from the request payload (the new one the
	// client just sent — earlier messages were persisted on prior turns) plus
	// every NEW assistant / tool message produced during this run.
	const lastUserMessage = [...clientMessages].reverse().find((m): m is PersistableMessage => {
		return typeof m === 'object' && m !== null && (m as PersistableMessage).role === 'user';
	});

	const newAssistantMessages = finalMessages.filter(
		(m): m is PersistableMessage =>
			typeof m === 'object' &&
			m !== null &&
			((m as PersistableMessage).role === 'assistant' || (m as PersistableMessage).role === 'tool')
	);

	const toPersist: Array<{
		role: 'user' | 'assistant' | 'tool' | 'system';
		parts: unknown;
	}> = [];
	if (lastUserMessage) {
		toPersist.push({ role: 'user', parts: lastUserMessage.parts ?? [] });
	}
	for (const m of newAssistantMessages) {
		const role = m.role as 'assistant' | 'tool';
		toPersist.push({ role, parts: m.parts ?? [] });
	}

	if (toPersist.length === 0) return;
	await appendMessages(conversationId, toPersist);
}
