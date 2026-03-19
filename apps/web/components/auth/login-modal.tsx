'use client';

import { Modal } from '@/components/ui/modal';
import { LoginContent } from '@/components/auth/login-content';
import { cn } from '@/lib/utils';

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
	message?: string;
	callbackUrl?: string;
}

/**
 * Login modal component - wraps shared LoginContent in a modal
 * Uses custom Modal component to avoid HeroUI compatibility issues
 */
export function LoginModal({ isOpen, onClose, message = 'Welcome back', callbackUrl }: LoginModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="3xl"
			backdrop="blur"
			isDismissable={true}
			hideCloseButton={false}
			className={cn(
				'bg-linear-to-br from-white to-gray-50',
				'dark:from-[#0a0a0a] dark:to-[#0a0a0a]',
				'border border-gray-200/50 dark:border-white/[0.04]',
				'dark:bg-opacity-95 dark:backdrop-blur-xl'
			)}
		>
			<LoginContent variant="modal" message={message} type="login" onSuccess={onClose} callbackUrl={callbackUrl} />
		</Modal>
	);
}
