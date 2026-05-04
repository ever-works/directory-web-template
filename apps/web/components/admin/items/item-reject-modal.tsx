import { useEffect } from 'react';
import { Button, Textarea } from '@heroui/react';
import { XCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ItemData } from '@/lib/types/item';

interface ItemRejectModalProps {
	isOpen: boolean;
	item: ItemData | null;
	rejectionReason: string;
	isSubmitting: boolean;
	onReasonChange: (value: string) => void;
	onConfirm: () => void;
	onClose: () => void;
}

const MODAL_OVERLAY = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-md bg-white dark:bg-[#121212] rounded-xl shadow-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200';
const MODAL_HEADER = 'px-6 py-4 border-b border-gray-200 dark:border-white/[0.06]';
const MODAL_BODY = 'p-6';
const ITEM_PREVIEW = 'p-3 bg-gray-50 dark:bg-white/[0.04] rounded-lg border border-gray-200 dark:border-white/[0.06]';

export function ItemRejectModal({
	isOpen,
	item,
	rejectionReason,
	isSubmitting,
	onReasonChange,
	onConfirm,
	onClose,
}: ItemRejectModalProps) {
	const t = useTranslations('admin.ADMIN_ITEMS_PAGE');

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

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && !isSubmitting) {
			onClose();
		}
	};

	if (!isOpen) return null;

	const isReasonValid = rejectionReason.length >= 10;
	const categories = item ? (Array.isArray(item.category) ? item.category : [item.category]) : [];

	return (
		<div className={MODAL_OVERLAY} onClick={handleOverlayClick}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true">
				{/* Header */}
				<div className={MODAL_HEADER}>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20">
								<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
							</div>
							<h2 className="text-base font-semibold text-gray-900 dark:text-white">
								{t('REJECT_MODAL_TITLE')}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{t('REJECT_MODAL_DESCRIPTION')}
					</p>

					{/* Item Preview */}
					{item && (
						<div className="mb-4">
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
								{t('ITEM_PREVIEW_LABEL')}
							</label>
							<div className={ITEM_PREVIEW}>
								<p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">/{item.slug}</p>
								{categories.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-2">
										{categories.map((cat, index) => (
											<span
												key={index}
												className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.06]"
											>
												{cat}
											</span>
										))}
									</div>
								)}
							</div>
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
							<p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
								<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
								{t('REJECTION_REASON_MIN_LENGTH')}
							</p>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 mt-6">
						<Button
							color="default"
							variant="flat"
							onPress={onClose}
							isDisabled={isSubmitting}
							className="font-medium text-gray-700 dark:text-gray-200"
						>
							{t('CANCEL')}
						</Button>
						<Button
							color="danger"
							onPress={onConfirm}
							isLoading={isSubmitting}
							isDisabled={isSubmitting || !isReasonValid}
							className="font-medium"
						>
							{t('CONFIRM_REJECT')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
