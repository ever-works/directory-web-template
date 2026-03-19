import { useEffect } from 'react';
import { Button, Textarea } from '@heroui/react';
import { XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorAd } from '@/lib/db/schema';

interface RejectModalProps {
	isOpen: boolean;
	sponsorAd: SponsorAd | null;
	rejectionReason: string;
	isSubmitting: boolean;
	onReasonChange: (value: string) => void;
	onConfirm: () => void;
	onClose: () => void;
}

const MODAL_OVERLAY = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden';
const MODAL_HEADER = 'bg-linear-to-r from-red-500 to-red-600 px-6 py-4';
const MODAL_BODY = 'p-6';
const ITEM_PREVIEW = 'p-3 bg-gray-100 dark:bg-gray-800 rounded-lg';

/**
 * Reject Modal Component
 * Modal for rejecting sponsor ads with reason
 */
export function RejectModal({
	isOpen,
	sponsorAd,
	rejectionReason,
	isSubmitting,
	onReasonChange,
	onConfirm,
	onClose,
}: RejectModalProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !isSubmitting) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, isSubmitting, onClose]);

	if (!isOpen) return null;

	const isReasonValid = rejectionReason.length >= 10;

	return (
		<div className={MODAL_OVERLAY}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true">
				{/* Header */}
				<div className={MODAL_HEADER}>
					<div className="flex items-center space-x-3">
						<div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
							<XCircle className="h-6 w-6 text-white" />
						</div>
						<h2 className="text-xl font-semibold text-white">{t('REJECT_MODAL_TITLE')}</h2>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{t('REJECT_MODAL_DESCRIPTION')}
					</p>

					{/* Item Preview */}
					{sponsorAd && (
						<div className={ITEM_PREVIEW}>
							<p className="font-medium text-gray-900 dark:text-white">{sponsorAd.itemSlug}</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">/{sponsorAd.itemSlug}</p>
						</div>
					)}

					{/* Rejection Reason */}
					<div className="mt-4">
						<label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							{t('REJECTION_REASON_LABEL')}
						</label>
						<Textarea
							id="rejectionReason"
							value={rejectionReason}
							onValueChange={onReasonChange}
							placeholder={t('REJECTION_REASON_PLACEHOLDER')}
							minRows={4}
							classNames={{
								input: 'text-sm',
							}}
						/>
						{rejectionReason.length > 0 && !isReasonValid && (
							<p className="text-xs text-red-500 mt-1">
								{t('REJECTION_REASON_MIN_LENGTH')}
							</p>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end space-x-3 mt-6">
						<Button
							color="default"
							variant="bordered"
							onPress={onClose}
							isDisabled={isSubmitting}
						>
							{t('CANCEL_BUTTON')}
						</Button>
						<Button
							color="danger"
							onPress={onConfirm}
							isLoading={isSubmitting}
							isDisabled={isSubmitting || !isReasonValid}
						>
							{t('REJECT_BUTTON')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
