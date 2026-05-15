import type { AuthenticatedScenario } from '@ever-works/plugin-ai-chat';

/**
 * Surface contract shared between the AI-chat React components.
 * Kept in one place so any swap of the underlying chat hook
 * (`@ai-sdk/react` → something else) only touches `ChatProvider`.
 */

export interface ChatViewProps {
	/** Scenario used for the API requests this provider issues. */
	scenario: AuthenticatedScenario;
	/** Current locale, forwarded to `/api/chat` as `locale`. */
	locale: string;
	/** Whether the visitor has an authenticated session. */
	isAuthenticated: boolean;
	/** Optional conversation id to resume from. */
	conversationId?: string;
	/** Current page URL (so the chat can answer "where am I?"). */
	currentPageUrl?: string | null;
}
