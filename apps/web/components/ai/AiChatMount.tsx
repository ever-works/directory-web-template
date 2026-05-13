import 'server-only';
import dynamic from 'next/dynamic';
import { parseAiChatConfig } from '@ever-works/plugin-ai-chat';
import { auth } from '@/lib/auth';
import { configManager } from '@/lib/config-manager';

/**
 * Server-side mount point for the floating chat launcher. Drops in
 * at the top level of `app/[locale]/layout.tsx`. When the visitor's
 * `works.yml` does not enable `aiChat`, this returns `null` and no
 * chat-related JavaScript ships to the public bundle (AC-1 + AC-7).
 *
 * When enabled, the launcher chunk is fetched lazily via
 * `next/dynamic`; the heavy panel bundle (`@ai-sdk/react`, message
 * components, etc.) is fetched on first chat-open by the launcher
 * itself.
 */

const ChatLauncher = dynamic(
	() => import('./ChatLauncher').then((mod) => ({ default: mod.ChatLauncher })),
	{
		loading: () => null,
	},
);

export interface AiChatMountProps {
	locale: string;
}

export async function AiChatMount({ locale }: AiChatMountProps) {
	const appConfig = configManager.getConfig();
	const parsed = parseAiChatConfig(appConfig.aiChat);
	if (!parsed.ok || !parsed.config.enabled) return null;
	if (parsed.config.position !== 'floating') {
		// hero-takeover / sidebar layouts are deferred (T-005d); fall back to
		// the floating launcher so the chat is still reachable when an
		// operator opts in early.
	}

	const session = await auth();
	const isAuthenticated = Boolean(session?.user?.id);

	return (
		<ChatLauncher
			scenario="browse"
			locale={locale}
			isAuthenticated={isAuthenticated}
		/>
	);
}
