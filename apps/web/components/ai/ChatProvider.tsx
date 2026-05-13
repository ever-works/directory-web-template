'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { AuthenticatedScenario } from '@ever-works/plugin-ai-chat';

/**
 * Bridges `@ai-sdk/react`'s `useChat()` to the rest of the AI-chat
 * UI tree. Keeps the surface deliberately narrow: components consume
 * `useAiChat()` and get back the message list, the input handler, the
 * stream status, plus a handful of metadata fields the rest of the
 * UI needs (locale, scenario, isAuthenticated).
 *
 * Single source of state — no parallel `useState` for messages, so
 * there's nothing to drift.
 */

export interface AiChatProviderProps {
	scenario: AuthenticatedScenario;
	locale: string;
	isAuthenticated: boolean;
	conversationId?: string;
	currentPageUrl?: string | null;
	children: ReactNode;
}

export interface AiChatContextValue {
	scenario: AuthenticatedScenario;
	locale: string;
	isAuthenticated: boolean;
	chat: UseChatHelpers<UIMessage>;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function AiChatProvider({
	scenario,
	locale,
	isAuthenticated,
	conversationId,
	currentPageUrl,
	children,
}: AiChatProviderProps) {
	// `DefaultChatTransport` is stable across renders; building it inside
	// `useMemo` avoids reconfiguring the underlying fetcher when the parent
	// re-renders with the same scenario/locale.
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: '/api/chat',
				body: {
					scenario,
					locale,
					conversationId,
					currentPageUrl: currentPageUrl ?? null,
				},
			}),
		[scenario, locale, conversationId, currentPageUrl],
	);

	const chat = useChat<UIMessage>({ transport });

	const value = useMemo<AiChatContextValue>(
		() => ({ scenario, locale, isAuthenticated, chat }),
		[scenario, locale, isAuthenticated, chat],
	);

	return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat(): AiChatContextValue {
	const value = useContext(AiChatContext);
	if (!value) {
		throw new Error('useAiChat must be used within <AiChatProvider>.');
	}
	return value;
}
