'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { UIMessage } from 'ai';

/**
 * Renders a single chat turn. Anything more elaborate than plain
 * text / tool-result JSON (markdown, code blocks, citations) lands
 * in a follow-up alongside the markdown renderer task.
 */

export interface ChatMessageProps {
	message: UIMessage;
}

interface TextPart {
	type: 'text';
	text: string;
}

interface ToolPartLike {
	type: string;
	toolName?: string;
	output?: unknown;
	input?: unknown;
}

function isTextPart(part: unknown): part is TextPart {
	return (
		typeof part === 'object' &&
		part !== null &&
		(part as { type?: unknown }).type === 'text' &&
		typeof (part as { text?: unknown }).text === 'string'
	);
}

function isToolPart(part: unknown): part is ToolPartLike {
	if (typeof part !== 'object' || part === null) return false;
	const type = (part as { type?: unknown }).type;
	return typeof type === 'string' && type.startsWith('tool-');
}

export function ChatMessage({ message }: ChatMessageProps) {
	const t = useTranslations('ai_chat');
	const isUser = message.role === 'user';
	const bubbleClasses = cn(
		'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
		isUser
			? 'self-end bg-primary text-primary-foreground'
			: 'self-start bg-default-100 text-foreground dark:bg-default-50'
	);
	const containerClasses = cn('flex flex-col gap-1 px-2', isUser ? 'items-end' : 'items-start');

	return (
		<li className={containerClasses}>
			<span className="text-xs text-default-500" aria-hidden="true">
				{isUser ? t('YOU_LABEL') : t('ASSISTANT_LABEL')}
			</span>
			<div className={bubbleClasses} role="article">
				{message.parts.map((part, index) => {
					if (isTextPart(part)) {
						return (
							<p key={index} className="whitespace-pre-wrap break-words">
								{part.text}
							</p>
						);
					}
					if (isToolPart(part)) {
						const toolName = part.toolName ?? part.type.replace(/^tool-/, '');
						return (
							<details
								key={index}
								className="mt-2 rounded-lg bg-default-50 px-3 py-2 text-xs dark:bg-default-100/50"
							>
								<summary className="cursor-pointer select-none font-medium">
									{t('TOOL_RESULT_FROM', { tool: toolName })}
								</summary>
								<pre className="mt-2 overflow-x-auto text-[0.7rem] text-default-700">
									{JSON.stringify(part.output ?? part.input ?? null, null, 2)}
								</pre>
							</details>
						);
					}
					return null;
				})}
			</div>
		</li>
	);
}
