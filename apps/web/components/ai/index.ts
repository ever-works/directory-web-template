/**
 * Barrel for the AI-chat React components (Spec 023 — T-005).
 *
 * The components live in `apps/web/components/ai/` rather than inside
 * `packages/plugin-ai-chat/` because they import `@heroui/react`,
 * `next-intl`, and `next/dynamic` — all of which live in this app.
 * Per Constitution Article I, the plugin packages stay
 * UI-library-agnostic; the host app owns its presentation layer.
 *
 * The plugin owns: config schema, tools, agent runner, prompt
 * scaffolding (TypeScript-only, no React-component dependencies on
 * the app).
 */

export { ChatLauncher } from './ChatLauncher';
export type { ChatLauncherProps } from './ChatLauncher';
export { ChatPanel } from './ChatPanel';
export type { ChatPanelProps } from './ChatPanel';
export { AiChatProvider, useAiChat } from './ChatProvider';
export type { AiChatProviderProps, AiChatContextValue } from './ChatProvider';
export { ChatMessages } from './ChatMessages';
export { ChatMessage } from './ChatMessage';
export type { ChatMessageProps } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { ChatWelcome } from './ChatWelcome';
