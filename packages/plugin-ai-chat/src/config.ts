import { z } from 'zod';

/**
 * `AiChatConfig` schema — validates the `aiChat` block in a
 * directory's `works.yml`. See `docs/spec/023-ai-chat/spec.md §9`.
 *
 * Defaults are chosen so a brand-new template that does **not** set
 * the `aiChat` block at all parses successfully with `enabled: false`,
 * i.e. the chat is off by default.
 */

export const CHAT_POSITIONS = ['floating', 'hero-takeover', 'sidebar'] as const;
export type ChatPosition = (typeof CHAT_POSITIONS)[number];

/**
 * Scenarios available to anonymous visitors out of the box. Each
 * scenario name maps to a system-prompt opener and a tool-set filter
 * at agent run time (see T-004 — runAgent).
 */
export const ANONYMOUS_SCENARIOS = ['browse', 'search', 'submit', 'pricing', 'login-help', 'support'] as const;
export type AnonymousScenario = (typeof ANONYMOUS_SCENARIOS)[number];

/**
 * Additional scenarios unlocked when the visitor is signed in. The
 * full authenticated set is the anonymous set ∪ these.
 */
export const AUTHENTICATED_EXTRA_SCENARIOS = ['my-submissions', 'my-favourites', 'my-profile', 'navigate'] as const;
export type AuthenticatedExtraScenario = (typeof AUTHENTICATED_EXTRA_SCENARIOS)[number];

export const AUTHENTICATED_SCENARIOS = [...ANONYMOUS_SCENARIOS, ...AUTHENTICATED_EXTRA_SCENARIOS] as const;
export type AuthenticatedScenario = (typeof AUTHENTICATED_SCENARIOS)[number];

/**
 * Locale identifiers we ship welcome / system-prompt translations
 * for out of the box (mirrors Spec 005). Operators can still set
 * `defaultLocale` to any string — `next-intl` decides at runtime
 * whether it has messages for it.
 */
export const SHIPPED_LOCALES = ['en', 'fr', 'es', 'de', 'ar', 'zh'] as const;

const anonymousPersonaSchema = z.object({
	enabled: z.boolean().default(true),
	scenarios: z
		.array(z.enum(ANONYMOUS_SCENARIOS))
		.min(1, 'at least one scenario must be enabled')
		.default([...ANONYMOUS_SCENARIOS])
});

const authenticatedPersonaSchema = z.object({
	enabled: z.boolean().default(true),
	scenarios: z
		.array(z.enum(AUTHENTICATED_SCENARIOS))
		.min(1, 'at least one scenario must be enabled')
		.default([...AUTHENTICATED_SCENARIOS])
});

export const AiChatConfigSchema = z
	.object({
		enabled: z.boolean().default(false),
		position: z.enum(CHAT_POSITIONS).default('floating'),
		provider: z.string().min(1).default('openrouter'),
		model: z.string().min(1).default('openai/gpt-4o-mini'),
		defaultLocale: z.string().min(2).default('en'),
		persist: z.boolean().default(false),
		anonymous: anonymousPersonaSchema.default({
			enabled: true,
			scenarios: [...ANONYMOUS_SCENARIOS]
		}),
		authenticated: authenticatedPersonaSchema.default({
			enabled: true,
			scenarios: [...AUTHENTICATED_SCENARIOS]
		})
	})
	.strict();

export type AiChatConfig = z.infer<typeof AiChatConfigSchema>;

/**
 * Inferred defaults. Equivalent to `AiChatConfigSchema.parse({})`.
 * Re-exported so consumers can read defaults without paying the
 * Zod parse cost.
 */
export const DEFAULT_AI_CHAT_CONFIG: AiChatConfig = AiChatConfigSchema.parse({});

/**
 * Validates an arbitrary partial config (typically the raw `aiChat`
 * block read from `works.yml`) and returns either a fully-defaulted
 * `AiChatConfig` or a structured Zod error.
 *
 * Consumers in `apps/web` (e.g. the future layout-mount seam) call
 * this on `appConfig.aiChat` — keeping the chat config schema entirely
 * inside this plugin package, in line with Constitution Article I
 * (core must not import from plugin packages).
 */
export function parseAiChatConfig(
	value: unknown
): { ok: true; config: AiChatConfig } | { ok: false; error: z.ZodError } {
	const result = AiChatConfigSchema.safeParse(value ?? {});
	if (result.success) {
		return { ok: true, config: result.data };
	}
	return { ok: false, error: result.error };
}
