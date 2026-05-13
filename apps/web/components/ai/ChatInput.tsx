'use client';

import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { Button, Textarea } from '@heroui/react';
import { Send, StopCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAiChat } from './ChatProvider';

/**
 * Message composer. Auto-resizing textarea + send button (or
 * stop button while a response is streaming).
 *
 * Keyboard map:
 *   - `Enter` submits.
 *   - `Shift+Enter` inserts a newline.
 */
export function ChatInput() {
	const t = useTranslations('ai_chat');
	const { chat } = useAiChat();
	const [text, setText] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const isStreaming = chat.status === 'streaming' || chat.status === 'submitted';
	const hasError = chat.status === 'error';

	useEffect(() => {
		// Focus the input on mount so visitors can just start typing.
		textareaRef.current?.focus();
	}, []);

	const submit = () => {
		const trimmed = text.trim();
		if (!trimmed || isStreaming) return;
		void chat.sendMessage({ text: trimmed });
		setText('');
	};

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	};

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		submit();
	};

	return (
		<form
			className="flex items-end gap-2 border-t border-default-200 px-3 py-3 dark:border-default-100"
			onSubmit={onSubmit}
		>
			<Textarea
				ref={textareaRef}
				value={text}
				onValueChange={setText}
				onKeyDown={onKeyDown}
				placeholder={t('PLACEHOLDER')}
				minRows={1}
				maxRows={6}
				aria-label={t('PLACEHOLDER')}
				isInvalid={hasError}
				errorMessage={hasError ? t('ERROR') : undefined}
				classNames={{ inputWrapper: 'min-h-unit-10' }}
			/>
			{isStreaming ? (
				<Button
					type="button"
					color="default"
					variant="flat"
					isIconOnly
					aria-label={t('STOP')}
					onPress={() => void chat.stop()}
				>
					<StopCircle className="h-4 w-4" aria-hidden="true" />
				</Button>
			) : (
				<Button
					type="submit"
					color="primary"
					isIconOnly
					aria-label={t('SEND')}
					isDisabled={!text.trim()}
				>
					<Send className="h-4 w-4" aria-hidden="true" />
				</Button>
			)}
		</form>
	);
}
