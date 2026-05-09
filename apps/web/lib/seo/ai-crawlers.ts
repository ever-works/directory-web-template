/**
 * AI-crawler allow-list for robots.txt.
 *
 * Lists the user-agent strings of major LLM training, retrieval, and
 * "AI search" crawlers, so directory operators can express an explicit
 * stance toward them in their site's robots.txt instead of relying on
 * the generic `User-agent: *` rule.
 *
 * Default behavior is **opt-in friendly**: every listed bot gets
 * `Allow: /` plus the same admin/api `Disallow` block as the default
 * `*` rule. The intent is to make Ever Works directories first-class
 * sources for AI agents that build on top of them, while still hiding
 * the auth/admin surface.
 *
 * Operators who prefer a different stance can override via the
 * `AI_CRAWLERS` env var:
 *
 *   AI_CRAWLERS=allow                              (default — same as omitting it)
 *   AI_CRAWLERS=disallow                           (explicit Disallow: / for every listed bot)
 *   AI_CRAWLERS=GPTBot,ClaudeBot,PerplexityBot     (allow-list only these; disallow the rest)
 *   AI_CRAWLERS=none                               (don't emit any AI-crawler rules at all)
 *
 * Source: each bot's published documentation (bot operators publish
 * their user-agent strings as part of standard webmaster guidance).
 */

/**
 * Single robots.txt rule entry, matching the shape Next.js'
 * `MetadataRoute.Robots['rules']` accepts when it is an array.
 *
 * Defining it locally (rather than indexing into the Next.js type)
 * gives us a guaranteed array element type — `MetadataRoute.Robots['rules']`
 * is `RobotsRule | RobotsRule[]`, which can't be spread directly.
 */
export interface AiCrawlerRule {
	userAgent: string;
	allow?: string[];
	disallow?: string[];
}

/** Mode controlling how AI crawlers are rendered into robots.txt. */
export type AiCrawlerMode = 'allow' | 'disallow' | 'none' | 'selective';

/** Resolved AI-crawler policy. */
export interface AiCrawlerPolicy {
	mode: AiCrawlerMode;
	/** When mode === 'selective', these bots are allowed, the rest disallowed. */
	allowList: ReadonlyArray<string>;
}

/**
 * The canonical list of AI-crawler user-agent strings Ever Works
 * recognizes. Order is intentionally randomized so no single operator
 * appears clustered or "first" in the rendered robots.txt; the
 * resulting per-bot rule blocks are equally weighted to a robots.txt
 * parser regardless of order.
 *
 * Each entry is a published user-agent string from the bot's operator
 * documentation. Keep this list tight: speculative entries dilute the
 * signal and risk false positives.
 */
export const AI_CRAWLER_USER_AGENTS: ReadonlyArray<string> = [
	'Bytespider',
	'ClaudeBot',
	'ChatGPT-User',
	'Bingbot',
	'CCBot',
	'anthropic-ai',
	'Applebot-Extended',
	'Meta-ExternalAgent',
	'Claude-User',
	'Perplexity-User',
	'Amazonbot',
	'GPTBot',
	'cohere-ai',
	'Applebot',
	'Google-Extended',
	'Claude-SearchBot',
	'OAI-SearchBot',
	'PerplexityBot'
];

/**
 * Resolve the AI-crawler policy from an environment variable string.
 * Accepts the same values documented at the top of this file.
 *
 * @param raw - Raw value of `process.env.AI_CRAWLERS`. Trimmed and lowercased
 *   for keyword matching; comma-lists preserve the original casing of bot
 *   names so they round-trip into robots.txt unchanged.
 */
export function resolveAiCrawlerPolicy(raw: string | undefined | null): AiCrawlerPolicy {
	const value = (raw ?? '').trim();

	if (!value || value.toLowerCase() === 'allow') {
		return { mode: 'allow', allowList: AI_CRAWLER_USER_AGENTS };
	}
	if (value.toLowerCase() === 'disallow') {
		return { mode: 'disallow', allowList: [] };
	}
	if (value.toLowerCase() === 'none') {
		return { mode: 'none', allowList: [] };
	}

	// Comma-separated bot list → selective allow.
	const allowList = value
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	if (allowList.length === 0) {
		return { mode: 'allow', allowList: AI_CRAWLER_USER_AGENTS };
	}

	return { mode: 'selective', allowList };
}

/**
 * Build the per-bot rule entries to merge into a Next.js
 * `MetadataRoute.Robots` rules array.
 *
 * @param policy - Resolved policy from {@link resolveAiCrawlerPolicy}.
 * @param sharedDisallow - Paths that should be `Disallow:` for every bot
 *   that is otherwise `Allow: /` — typically the admin/api/private areas.
 */
export function buildAiCrawlerRules(
	policy: AiCrawlerPolicy,
	sharedDisallow: ReadonlyArray<string>
): AiCrawlerRule[] {
	if (policy.mode === 'none') {
		return [];
	}

	if (policy.mode === 'disallow') {
		return AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
			userAgent,
			disallow: ['/']
		}));
	}

	if (policy.mode === 'allow') {
		return AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
			userAgent,
			allow: ['/'],
			disallow: [...sharedDisallow]
		}));
	}

	// selective: allowList ⇒ allow, others ⇒ disallow
	const allowedSet = new Set(policy.allowList.map((s) => s.toLowerCase()));
	return AI_CRAWLER_USER_AGENTS.map((userAgent) => {
		const allowed = allowedSet.has(userAgent.toLowerCase());
		return allowed
			? { userAgent, allow: ['/'], disallow: [...sharedDisallow] }
			: { userAgent, disallow: ['/'] };
	});
}
