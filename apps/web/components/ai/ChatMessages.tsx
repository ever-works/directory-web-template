'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAiChat } from './ChatProvider';
import { ChatMessage } from './ChatMessage';
import { ChatWelcome } from './ChatWelcome';

/**
 * Vertical scroll list of chat turns. Auto-scrolls to the latest
 * message on every update; renders the welcome screen when the
 * conversation is empty.
 */
export function ChatMessages() {
	const t = useTranslations('ai_chat');
	const { chat } = useAiChat();
	const containerRef = useRef<HTMLOListElement | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		// Defer to next frame so streaming updates land in the DOM before we scroll.
		const id = requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight;
		});
		return () => cancelAnimationFrame(id);
	}, [chat.messages]);

	if (chat.messages.length === 0) {
		return <ChatWelcome />;
	}

	const isStreaming = chat.status === 'streaming' || chat.status === 'submitted';

	return (
		<ol
			ref={containerRef}
			className="flex h-full flex-col gap-4 overflow-y-auto px-2 py-3"
			aria-live="polite"
			aria-busy={isStreaming}
		>
			{chat.messages.map((message) => (
				<ChatMessage key={message.id} message={message} />
			))}
			{isStreaming ? (
				<li className="px-2 text-sm italic text-default-500" aria-hidden="true">
					{t('TYPING')}
				</li>
			) : null}
		</ol>
	);
}
