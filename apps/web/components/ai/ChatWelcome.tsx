'use client';

import { Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useAiChat } from './ChatProvider';

interface SuggestionChip {
	labelKey: Parameters<ReturnType<typeof useTranslations<'ai_chat'>>>[0];
	prompt: string;
	authOnly?: boolean;
}

const ANON_CHIPS: SuggestionChip[] = [
	{ labelKey: 'WELCOME_CHIP_BROWSE', prompt: 'Show me popular items in this directory.' },
	{ labelKey: 'WELCOME_CHIP_SEARCH', prompt: 'Find items tagged "open-source".' },
	{ labelKey: 'WELCOME_CHIP_SUBMIT', prompt: 'How do I submit a product?' },
	{ labelKey: 'WELCOME_CHIP_PRICING', prompt: 'What pricing plans are available?' },
	{ labelKey: 'WELCOME_CHIP_SIGN_IN', prompt: 'How do I sign in?' },
	{ labelKey: 'WELCOME_CHIP_SUPPORT', prompt: 'I need help with something.' },
];

const AUTH_CHIPS: SuggestionChip[] = [
	{ labelKey: 'WELCOME_CHIP_MY_SUBMISSIONS', prompt: 'What did I submit recently?', authOnly: true },
	{ labelKey: 'WELCOME_CHIP_MY_FAVOURITES', prompt: 'Show me my favourites.', authOnly: true },
	{ labelKey: 'WELCOME_CHIP_MY_PROFILE', prompt: 'Summarise my profile.', authOnly: true },
];

/**
 * First-run state shown when the conversation is empty. Surfaces a
 * short prompt and a row of clickable suggestion chips that pre-fill
 * the input with a starter message.
 */
export function ChatWelcome() {
	const t = useTranslations('ai_chat');
	const { isAuthenticated, chat } = useAiChat();
	const chips = isAuthenticated ? [...ANON_CHIPS, ...AUTH_CHIPS] : ANON_CHIPS;

	const sendStarter = (prompt: string) => {
		void chat.sendMessage({ text: prompt });
	};

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-8 text-center">
			<h3 className="text-lg font-semibold text-foreground">{t('EMPTY_STATE_TITLE')}</h3>
			<p className="max-w-prose text-sm text-default-500">{t('EMPTY_STATE_BODY')}</p>
			<div className="flex flex-wrap justify-center gap-2" role="list">
				{chips.map((chip) => (
					<Chip
						key={chip.labelKey}
						as="button"
						role="listitem"
						className="cursor-pointer"
						variant="flat"
						onClick={() => sendStarter(chip.prompt)}
					>
						{t(chip.labelKey)}
					</Chip>
				))}
			</div>
		</div>
	);
}
