import { useEffect } from 'react';
import { XCircle, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
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
			if (e.key === 'Escape' && !isSubmitting) onClose();
		};
		if (isOpen) document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, isSubmitting, onClose]);

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget && !isSubmitting) onClose();
	};

	if (!isOpen) return null;

	const isReasonValid = rejectionReason.length >= 10;
	const categories = item ? (Array.isArray(item.category) ? item.category : [item.category]) : [];

	return (
		<div
			className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={handleOverlayClick}
		>
			<div
				className="w-full max-w-md bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/8 overflow-hidden"
				role="dialog"
				aria-modal="true"
			>
				{/* Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
								<XCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
							</div>
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
								{t('REJECT_MODAL_TITLE')}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-40"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="p-5 space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{t('REJECT_MODAL_DESCRIPTION')}
					</p>

					{/* Item Preview */}
					{item && (
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">
								{t('ITEM_PREVIEW_LABEL')}
							</label>
							<div className="p-3 bg-gray-50 dark:bg-white/4 rounded-xl border border-gray-100 dark:border-white/8">
								<p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">/{item.slug}</p>
								{categories.length > 0 && (
									<div className="flex flex-wrap gap-1 mt-2">
										{categories.map((cat, index) => (
											<span
												key={index}
												className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/6 dark:text-gray-400 dark:ring-white/8"
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
					<div className="space-y-1.5">
						<label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{t('REJECTION_REASON_LABEL')}
						</label>
						<textarea
							id="rejectionReason"
							value={rejectionReason}
							onChange={(e) => onReasonChange(e.target.value)}
							placeholder={t('REJECTION_REASON_PLACEHOLDER')}
							rows={4}
							disabled={isSubmitting}
							className={cn(
								"w-full px-3 py-2.5 text-sm rounded-xl resize-none",
								"bg-white dark:bg-white/3",
								"border border-gray-200 dark:border-white/8",
								"text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
								"focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20",
								"transition-all duration-150 disabled:opacity-50"
							)}
						/>
						{rejectionReason.length > 0 && !isReasonValid && (
							<p className="text-xs text-red-500 flex items-center gap-1">
								<span className="inline-block w-1 h-1 rounded-full bg-red-500 shrink-0" />
								{t('REJECTION_REASON_MIN_LENGTH')}
							</p>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
						>
							{t('CANCEL')}
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isSubmitting || !isReasonValid}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
						>
							{isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
							{t('CONFIRM_REJECT')}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
