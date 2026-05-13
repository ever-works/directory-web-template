'use client';

import {
	Modal,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
	type ModalProps,
} from '@heroui/react';
import { useTranslations } from 'next-intl';
import type { AuthenticatedScenario } from '@ever-works/plugin-ai-chat';
import { AiChatProvider } from './ChatProvider';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';

export interface ChatPanelProps {
	isOpen: boolean;
	onOpenChange: ModalProps['onOpenChange'];
	scenario: AuthenticatedScenario;
	locale: string;
	isAuthenticated: boolean;
	conversationId?: string;
	currentPageUrl?: string | null;
}

/**
 * The chat dialog itself. Built on HeroUI's `<Modal>` so we get the
 * focus trap, `Esc`-to-close, `role="dialog"` / `aria-modal="true"`,
 * and `aria-labelledby` wiring for free — same primitive
 * `components/settings-modal.tsx` and `components/tags-modal.tsx`
 * use. Mounted lazily by `<ChatLauncher>`.
 */
export function ChatPanel({
	isOpen,
	onOpenChange,
	scenario,
	locale,
	isAuthenticated,
	conversationId,
	currentPageUrl,
}: ChatPanelProps) {
	const t = useTranslations('ai_chat');

	return (
		<Modal
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			size="2xl"
			placement="bottom-center"
			scrollBehavior="inside"
			aria-label={t('TITLE')}
			classNames={{
				base: 'h-[80vh] max-h-[640px] sm:bottom-6 sm:right-6 sm:m-0',
				wrapper: 'sm:justify-end sm:items-end',
			}}
		>
			<ModalContent>
				{() => (
					<AiChatProvider
						scenario={scenario}
						locale={locale}
						isAuthenticated={isAuthenticated}
						conversationId={conversationId}
						currentPageUrl={currentPageUrl ?? null}
					>
						<ModalHeader className="border-b border-default-200 dark:border-default-100">
							<span className="text-base font-semibold">{t('TITLE')}</span>
						</ModalHeader>
						<ModalBody className="px-0 py-0">
							<div className="flex h-full flex-col">
								<div className="flex-1 overflow-hidden">
									<ChatMessages />
								</div>
							</div>
						</ModalBody>
						<ModalFooter className="px-0 py-0">
							<div className="w-full">
								<ChatInput />
							</div>
						</ModalFooter>
					</AiChatProvider>
				)}
			</ModalContent>
		</Modal>
	);
}
