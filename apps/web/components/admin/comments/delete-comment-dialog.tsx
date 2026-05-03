'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AdminCommentUser {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
}

interface AdminCommentItem {
	id: string;
	content: string;
	rating: number | null;
	userId: string;
	itemId: string;
	createdAt: string | null;
	updatedAt: string | null;
	user: AdminCommentUser;
}

interface DeleteCommentDialogProps {
	comment: AdminCommentItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

const SPINNER = (
	<svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

export default function DeleteCommentDialog({ comment, open, onOpenChange, onConfirm }: DeleteCommentDialogProps) {
	const t = useTranslations('admin.DELETE_COMMENT_DIALOG');
	const [isLoading, setIsLoading] = useState(false);

	const handleConfirm = async () => {
		setIsLoading(true);
		try {
			await onConfirm();
		} catch (error) {
			console.error('Error deleting comment:', error);
		} finally {
			setIsLoading(false);
		}
	};

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={(e) => e.target === e.currentTarget && !isLoading && onOpenChange(false)}
		>
			<div className="w-full max-w-lg bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">

				{/* Header */}
				<div className="px-6 py-4 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 ring-1 ring-red-100 dark:ring-red-500/20">
							<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">{t('TITLE')}</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => !isLoading && onOpenChange(false)}
						disabled={isLoading}
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="p-6 space-y-4">
					{/* Warning banner */}
					<div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
							<div>
								<p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-0.5">{t('WARNING_TITLE')}</p>
								<p className="text-sm text-red-600 dark:text-red-300">{t('WARNING_MESSAGE')}</p>
							</div>
						</div>
					</div>

					{/* Comment preview */}
					<div className="bg-gray-50/60 dark:bg-white/3 rounded-xl border border-gray-100 dark:border-white/6 p-4">
						<div className="flex items-start gap-3">
							<div className="w-9 h-9 bg-gray-100 dark:bg-white/8 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm shrink-0 ring-2 ring-white dark:ring-gray-900/80">
								{(comment.user.name || comment.user.email || 'U').charAt(0).toUpperCase()}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1.5 flex-wrap">
									<p className="text-sm font-semibold text-gray-900 dark:text-white">
										{comment.user.name || comment.user.email || t('UNKNOWN_USER')}
									</p>
									{comment.rating !== null && (
										<span className="px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full ring-1 ring-inset ring-gray-200 dark:ring-white/10">
											⭐ {comment.rating}/5
										</span>
									)}
								</div>
								<p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
									{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : t('UNKNOWN_DATE')}
								</p>
								<div className="bg-white dark:bg-white/2 border border-gray-100 dark:border-white/6 rounded-xl p-3">
									<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{comment.content}</p>
								</div>
								<div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
									<MessageSquare className="w-3 h-3" />
									<span>{t('ITEM_ID')}: {comment.itemId}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-gray-100 dark:border-white/8 flex items-center gap-2.5">
					<button
						type="button"
						disabled={isLoading}
						onClick={() => onOpenChange(false)}
						className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
					>
						{t('CANCEL')}
					</button>
					<button
						type="button"
						disabled={isLoading}
						onClick={handleConfirm}
						className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/20 transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
					>
						{isLoading ? SPINNER : <Trash2 className="w-4 h-4" />}
						{isLoading ? t('DELETING') : t('DELETE_COMMENT')}
					</button>
				</div>
			</div>
		</div>
	);
}
