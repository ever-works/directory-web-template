import 'server-only';
import type { AiChatConfig } from '@ever-works/plugin-ai-chat';

/**
 * Test-only escape hatch that lets the Playwright suite flip
 * `aiChat.enabled` per browser context without rewriting `works.yml`.
 *
 * The override is gated by `E2E_ALLOW_TEST_OVERRIDES=true` so it can
 * never activate in production. The cookie name + secret value are
 * intentionally hard to guess so that, even with the env flag flipped,
 * a casual attacker can't trip it.
 *
 * Used by:
 *   - `components/ai/AiChatMount.tsx` (server component) to decide
 *     whether to mount the launcher.
 *   - `app/api/chat/route.ts` to honour the override on the streaming
 *     request itself.
 */

export const AI_CHAT_TEST_OVERRIDE_COOKIE = 'ai-chat-test-override';
const ENABLED_TOKEN = 'enabled';

function overridesAllowed(): boolean {
	return process.env.E2E_ALLOW_TEST_OVERRIDES === 'true' && process.env.NODE_ENV !== 'production';
}

function tokenMatches(value: string | undefined | null): boolean {
	if (!value) return false;
	const expected = process.env.E2E_TEST_OVERRIDE_TOKEN ?? ENABLED_TOKEN;
	return value === expected;
}

export function isAiChatTestOverrideCookie(value: string | undefined | null): boolean {
	if (!overridesAllowed()) return false;
	return tokenMatches(value);
}

export function applyAiChatTestOverride(config: AiChatConfig, override: boolean): AiChatConfig {
	if (!override) return config;
	return {
		...config,
		enabled: true,
		anonymous: { ...config.anonymous, enabled: true },
		authenticated: { ...config.authenticated, enabled: true }
	};
}
