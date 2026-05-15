import 'server-only';
import dynamic from 'next/dynamic';
import { cookies } from 'next/headers';
import { parseAiChatConfig } from '@ever-works/plugin-ai-chat';
import { auth } from '@/lib/auth';
import { configManager } from '@/lib/config-manager';
import {
	AI_CHAT_TEST_OVERRIDE_COOKIE,
	applyAiChatTestOverride,
	isAiChatTestOverrideCookie
} from '@/lib/services/ai-chat-test-overrides';

/**
 * Server-side mount point for the floating chat launcher. Drops in
 * at the top level of `app/[locale]/layout.tsx`. When the visitor's
 * `works.yml` does not enable `aiChat`, this returns `null` and no
 * chat-related JavaScript ships to the public bundle (AC-1 + AC-7).
 *
 * `aiChat.enabled` defaults to `true` in the plugin schema. The chat
 * still gracefully no-ops when `AI_CHAT_API_KEY` is missing — the
 * launcher won't mount, so a directory operator who hasn't provisioned
 * a provider key never ships a broken UI.
 *
 * When enabled, the launcher chunk is fetched lazily via
 * `next/dynamic`; the heavy panel bundle (`@ai-sdk/react`, message
 * components, etc.) is fetched on first chat-open by the launcher
 * itself.
 */

const ChatLauncher = dynamic(() => import('./ChatLauncher').then((mod) => ({ default: mod.ChatLauncher })), {
	loading: () => null
});

let missingApiKeyWarned = false;

export interface AiChatMountProps {
	locale: string;
}

export async function AiChatMount({ locale }: AiChatMountProps) {
	const appConfig = configManager.getConfig();
	const parsed = parseAiChatConfig(appConfig.aiChat);
	if (!parsed.ok) return null;

	const cookieStore = await cookies();
	const overrideActive = isAiChatTestOverrideCookie(cookieStore.get(AI_CHAT_TEST_OVERRIDE_COOKIE)?.value);
	const config = applyAiChatTestOverride(parsed.config, overrideActive);

	if (!config.enabled) return null;

	// Silent fallback: chat is enabled by default in the schema, but if no
	// provider key is set we skip the mount rather than showing a launcher
	// that 503s on first message. Operators get a one-line warning on the
	// server so the missing key is discoverable.
	if (!process.env.AI_CHAT_API_KEY) {
		if (!missingApiKeyWarned) {
			missingApiKeyWarned = true;
			console.warn(
				'[ai-chat] aiChat is enabled but AI_CHAT_API_KEY is not set; the chat launcher is hidden until a key is provided.'
			);
		}
		return null;
	}

	if (config.position !== 'floating') {
		// hero-takeover / sidebar layouts are deferred (T-005d); fall back to
		// the floating launcher so the chat is still reachable when an
		// operator opts in early.
	}

	const session = await auth();
	const isAuthenticated = Boolean(session?.user?.id);

	return <ChatLauncher scenario="browse" locale={locale} isAuthenticated={isAuthenticated} />;
}
