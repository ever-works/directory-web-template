'use client';

import { useEffect } from 'react';
import { Button, Textarea } from '@heroui/react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorAd } from '@/lib/db/schema';
import { formatSlugToTitle } from './constants';

interface CancelDialogProps {
	isOpen: boolean;
	sponsorAd: SponsorAd | null;
	cancelReason: string;
	isSubmitting: boolean;
	onReasonChange: (value: string) => void;
	onConfirm: () => void;
	onClose: () => void;
}

// Styling constants
const MODAL_OVERLAY = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden';
const MODAL_HEADER = 'bg-linear-to-r from-amber-500 to-amber-600 px-6 py-4';
const MODAL_BODY = 'p-6';
const ITEM_PREVIEW = 'p-3 bg-gray-100 dark:bg-gray-800 rounded-lg';
const WARNING_BOX =
	'flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50';

/**
 * Cancel Dialog Component
 * Modal for cancelling sponsor ads with optional reason
 */
export function CancelDialog({
	isOpen,
	sponsorAd,
	cancelReason,
	isSubmitting,
	onReasonChange,
	onConfirm,
	onClose
}: CancelDialogProps) {
	const t = useTranslations('client.sponsorships');

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !isSubmitting) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';

			return () => {
				document.removeEventListener('keydown', handleEscape);
				document.body.style.overflow = '';
			};
		}
	}, [isOpen, isSubmitting, onClose]);

	if (!isOpen) return null;

	return (
		<div className={MODAL_OVERLAY} onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true">
				{/* Header */}
				<div className={MODAL_HEADER}>
					<div className="flex items-center space-x-3">
						<div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
							<XCircle className="h-6 w-6 text-white" />
						</div>
						<h2 className="text-xl font-semibold text-white">{t('CANCEL_DIALOG_TITLE')}</h2>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					{/* Warning */}
					<div className={WARNING_BOX}>
						<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<p className="text-sm text-amber-800 dark:text-amber-200">{t('CANCEL_DIALOG_WARNING')}</p>
					</div>

					{/* Item Preview */}
					{sponsorAd && (
						<div className={`${ITEM_PREVIEW} mt-4`}>
							<p className="font-medium text-gray-900 dark:text-white">
								{formatSlugToTitle(sponsorAd.itemSlug)}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{t(`INTERVAL_${(sponsorAd.interval ?? 'monthly').toUpperCase()}`)} {t('SPONSORSHIP')}
							</p>
						</div>
					)}

					{/* Optional Cancel Reason */}
					<div className="mt-4">
						<label
							htmlFor="cancelReason"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							{t('CANCEL_REASON_LABEL')} <span className="text-gray-400">({t('OPTIONAL')})</span>
						</label>
						<Textarea
							id="cancelReason"
							value={cancelReason}
							onValueChange={onReasonChange}
							placeholder={t('CANCEL_REASON_PLACEHOLDER')}
							minRows={3}
							maxLength={500}
							classNames={{
								input: 'text-sm'
							}}
						/>
						<p className="text-xs text-gray-400 mt-1">{cancelReason.length}/500</p>
					</div>

					{/* Actions */}
					<div className="flex justify-end space-x-3 mt-6">
						<Button color="default" variant="bordered" onPress={onClose} isDisabled={isSubmitting}>
							{t('KEEP_SPONSORSHIP')}
						</Button>
						<Button color="danger" onPress={onConfirm} isLoading={isSubmitting} isDisabled={isSubmitting}>
							{t('CONFIRM_CANCEL')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
