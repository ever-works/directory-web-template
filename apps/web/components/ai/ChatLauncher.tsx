'use client';

import { useEffect, useState } from 'react';
import { useDisclosure } from '@heroui/react';
import { Button } from '@heroui/react';
import { MessageCircle, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { AuthenticatedScenario } from '@ever-works/plugin-ai-chat';
import { cn } from '@/lib/utils';

const ChatPanel = dynamic(
	() => import('./ChatPanel').then((mod) => ({ default: mod.ChatPanel })),
	{
		ssr: false,
		// Loading state is the closed panel — the launcher button keeps showing.
		loading: () => null,
	},
);

export interface ChatLauncherProps {
	/**
	 * Default scenario the user lands on. The layout/route picks this
	 * based on `aiChat.position` and the page context.
	 */
	scenario: AuthenticatedScenario;
	/** Current locale; forwarded to the chat API. */
	locale: string;
	/** Whether the visitor has an authenticated session. */
	isAuthenticated: boolean;
	/** Optional conversation id to resume. */
	conversationId?: string;
	/** Optional class override for the launcher button (e.g. mobile tweaks). */
	className?: string;
}

/**
 * Floating launcher button. Renders just a button on first paint —
 * the heavy panel bundle (`ai`, `@ai-sdk/react`, message components,
 * HeroUI Modal subtree) is lazy-loaded the first time the visitor
 * opens the chat. Article V budget preserved.
 *
 * The launcher itself is a tiny client component: no chat hooks
 * mount until `isOpen` flips to `true`.
 */
export function ChatLauncher({
	scenario,
	locale,
	isAuthenticated,
	conversationId,
	className,
}: ChatLauncherProps) {
	const t = useTranslations('ai_chat');
	const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
	const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
	const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);

	// Capture the current URL only when the chat is actually opened — avoids
	// running on every navigation, and keeps the launcher SSR-friendly.
	useEffect(() => {
		if (!isOpen) return;
		setCurrentPageUrl(typeof window !== 'undefined' ? window.location.href : null);
		if (!hasOpenedOnce) setHasOpenedOnce(true);
	}, [isOpen, hasOpenedOnce]);

	const Icon = isOpen ? X : MessageCircle;

	return (
		<>
			<Button
				type="button"
				color="primary"
				radius="full"
				isIconOnly
				size="lg"
				aria-label={isOpen ? t('LAUNCHER_CLOSE_LABEL') : t('LAUNCHER_LABEL')}
				onPress={isOpen ? onClose : onOpen}
				className={cn(
					'fixed bottom-6 right-6 z-[9000] shadow-lg shadow-primary/30',
					'rtl:left-6 rtl:right-auto',
					className,
				)}
				data-testid="ai-chat-launcher"
			>
				<Icon className="h-5 w-5" aria-hidden="true" />
			</Button>
			{hasOpenedOnce ? (
				<ChatPanel
					isOpen={isOpen}
					onOpenChange={onOpenChange}
					scenario={scenario}
					locale={locale}
					isAuthenticated={isAuthenticated}
					conversationId={conversationId}
					currentPageUrl={currentPageUrl}
				/>
			) : null}
		</>
	);
}
