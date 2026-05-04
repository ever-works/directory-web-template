'use client';

import { useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn, isDemoMode } from '@/lib/utils';
import { useSettingsModal } from '@/hooks/use-settings-modal';
import { useTranslations } from 'next-intl';
import SelectLayout from '@/components/ui/select-layout';
import SelectContainerWidth from '@/components/ui/select-container-width';
import SelectPaginationType from '@/components/ui/select-pagination-type';
import SelectDatabaseMode from '@/components/ui/select-database-mode';
import SelectCheckoutProvider from '@/components/ui/select-checkout-provider';
import { DatabaseStatusWarning } from '@/components/ui/database-status-warning';
import { useFocusManagement } from '@/components/ui/accessibility';

const BACKDROP_CLASSES = cn(
	'fixed inset-0',
	'bg-gradient-to-br from-black/50 via-black/60 to-black/70',
	'dark:bg-gradient-to-br dark:from-black/70 dark:via-black/80 dark:to-black/90',
	'backdrop-blur-2xl backdrop-saturate-150',
	'z-[9998]',
	'transition-all duration-300 ease-out'
);

const MODAL_CLASSES = cn(
	'fixed top-1/2 left-1/2 overflow-hidden',
	'transform -translate-x-1/2 -translate-y-1/2',
	'w-full max-w-2xl',
	'max-h-[90vh]',
	'bg-white/95 dark:bg-[#0a0a0a]/95',
	'backdrop-blur-xl',
	'border border-gray-200/50 dark:border-white/[0.07]',
	'rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60',
	'z-[9999]',
	'overflow-visible',
	'transition-all duration-300 ease-out',
	'animate-fade-in-up'
);

const _DIVIDER_CLASSES = cn('border-t border-gray-200 dark:border-white/6');

export function SettingsModal() {
	const { isOpen, closeModal } = useSettingsModal();
	const t = useTranslations('settings');
	const { focusRef, setFocus, trapFocus } = useFocusManagement();
	const isDemo = isDemoMode();

	// Auto-focus the modal when it opens and setup focus trap
	useEffect(() => {
		if (isOpen) {
			// Focus the modal container after a brief delay to ensure it's rendered
			setTimeout(() => setFocus(), 100);

			// Add keyboard listener for focus trap
			const handleKeyDown = (e: KeyboardEvent) => trapFocus(e);
			document.addEventListener('keydown', handleKeyDown);

			return () => {
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	}, [isOpen, setFocus, trapFocus]);

	if (!isOpen || typeof window === 'undefined') {
		return null;
	}

	return createPortal(
		<>
			{/* Backdrop */}
			<div className={BACKDROP_CLASSES} onClick={closeModal} aria-hidden="true" />

			{/* Modal */}
			<div
				ref={focusRef as React.RefObject<HTMLDivElement>}
				className={MODAL_CLASSES}
				role="dialog"
				aria-modal="true"
				aria-labelledby="settings-title"
				tabIndex={-1}
			>
				{/* Modal Header */}
				<div
					className={cn(
						'flex items-center justify-between px-4 md:px-6 py-4',
						'border-b border-gray-200 dark:border-white/6',
						'bg-gradient-to-r from-gray-50/50 to-white',
						'dark:from-[#0a0a0a]/50 dark:to-[#0a0a0a]/50',
						'shadow-sm'
					)}
				>
					<div className="flex items-center gap-3">
						<div
							className={cn(
								'p-2 rounded-lg overflow-hidden',
								'bg-gradient-to-br from-theme-primary-100 to-theme-primary-200',
								'dark:from-theme-primary-900/30 dark:to-theme-primary-800/30',
								'border border-theme-primary-300/50 dark:border-theme-primary-600/50'
							)}
						>
							<Settings className="h-4 w-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h2
							id="settings-title"
							className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
						>
							{t('SETTINGS')}
						</h2>
					</div>
					<button
						onClick={closeModal}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'text-gray-500 hover:text-gray-700',
							'dark:text-gray-400 dark:hover:text-gray-200',
							'hover:bg-gray-100 dark:hover:bg-white/6',
							'hover:scale-110'
						)}
						aria-label={t('CLOSE_SETTINGS')}
						type="button"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Modal Content */}
				<div
					className={cn(
						'px-4 md:px-6 py-4 space-y-5',
						'overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1',
						'max-h-[calc(90vh-96px)]',
						'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1'
					)}
				>
					{/* Layout Section - Always show */}
					<SelectLayout />

					{/* Container Width Section - Always show */}
					<SelectContainerWidth />

					{/* Pagination Style Section - Always show */}
					<SelectPaginationType />

					{/* Database Features Section - Demo only */}
					{isDemo && <SelectDatabaseMode />}

					{/* Checkout Provider Selection - Demo only */}
					{isDemo && <SelectCheckoutProvider />}

					{/* Database Status Warning - Demo only */}
					{isDemo && <DatabaseStatusWarning className="mt-3" />}
				</div>
			</div>
		</>,
		document.body
	);
}
