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

// Visual treatment matches `/client/settings` (`settings-content.tsx`):
// flat surfaces, theme-primary tinted icon square, neutral borders, no
// glassmorphism. The modal reads as the same control system as the page.
const BACKDROP_CLASSES = cn(
	'fixed inset-0',
	'bg-black/40 dark:bg-black/60',
	'backdrop-blur-sm',
	'z-[9998]',
	'transition-opacity duration-200 ease-out'
);

const MODAL_CLASSES = cn(
	'fixed top-1/2 left-1/2 overflow-hidden',
	'transform -translate-x-1/2 -translate-y-1/2',
	'w-full max-w-2xl',
	'max-h-[90vh]',
	'bg-white dark:bg-[#111111]',
	'border border-gray-200 dark:border-white/6',
	'rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/60',
	'z-[9999]',
	'transition-all duration-200 ease-out',
	'animate-fade-in-up'
);

const HEADER_ICON_WRAPPER_CLASSES = cn(
	'shrink-0 w-8 h-8',
	'flex items-center justify-center',
	'rounded-lg',
	'bg-theme-primary-50 dark:bg-theme-primary-900/30'
);

const HEADER_ICON_CLASSES = cn('w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400');

const CLOSE_BUTTON_CLASSES = cn(
	'p-2 rounded-lg',
	'text-gray-500 dark:text-gray-400',
	'hover:text-gray-700 dark:hover:text-gray-200',
	'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
	'transition-colors duration-150'
);

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
				{/* Modal Header — flat treatment matching `/client/settings` */}
				<div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-white/6">
					<div className="flex items-center gap-3 min-w-0">
						<span className={HEADER_ICON_WRAPPER_CLASSES}>
							<Settings className={HEADER_ICON_CLASSES} />
						</span>
						<h2
							id="settings-title"
							className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100 truncate"
						>
							{t('SETTINGS')}
						</h2>
					</div>
					<button
						onClick={closeModal}
						className={CLOSE_BUTTON_CLASSES}
						aria-label={t('CLOSE_SETTINGS')}
						type="button"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Modal Content */}
				<div
					className={cn(
						'px-4 md:px-6 py-4 space-y-5',
						'overflow-y-auto overscroll-contain max-h-[calc(90vh-72px)]',
						'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40',
						'dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1'
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
