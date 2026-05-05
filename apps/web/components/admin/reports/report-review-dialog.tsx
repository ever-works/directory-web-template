'use client';

import { useState, useEffect } from 'react';
import { Flag, X, Loader2, User, Calendar, FileText, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReportStatus, ReportResolution } from '@/lib/db/schema';
import type { ReportStatusValues, ReportResolutionValues } from '@/lib/db/schema';
import type { AdminReportItem, UpdateReportParams } from '@/hooks/use-admin-reports';
import { cn } from '@/lib/utils';

const INPUT_BASE = cn(
	'w-full h-10 px-3 text-sm rounded-xl',
	'bg-white dark:bg-white/5',
	'border border-gray-200 dark:border-white/8',
	'text-gray-900 dark:text-white',
	'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
	'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed appearance-none'
);

const RESOLUTION_OPTIONS: { value: ReportResolutionValues; label: string; description: string }[] = [
	{ value: ReportResolution.CONTENT_REMOVED, label: 'Remove Content', description: 'Delete the reported content' },
	{ value: ReportResolution.USER_WARNED, label: 'Warn User', description: 'Send a warning to the content owner' },
	{ value: ReportResolution.USER_SUSPENDED, label: 'Suspend User', description: 'Temporarily suspend the user' },
	{ value: ReportResolution.USER_BANNED, label: 'Ban User', description: 'Permanently ban the user' },
	{ value: ReportResolution.NO_ACTION, label: 'No Action', description: 'Dismiss without taking action' }
];

const STATUS_OPTIONS: { value: ReportStatusValues; label: string }[] = [
	{ value: ReportStatus.PENDING, label: 'Pending' },
	{ value: ReportStatus.REVIEWED, label: 'Reviewed' },
	{ value: ReportStatus.RESOLVED, label: 'Resolved' },
	{ value: ReportStatus.DISMISSED, label: 'Dismissed' }
];

interface ReportReviewDialogProps {
	report: AdminReportItem;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, data: UpdateReportParams) => Promise<boolean>;
	onClose: () => void;
}

export default function ReportReviewDialog({ report, open, onOpenChange, onUpdate, onClose }: ReportReviewDialogProps) {
	const t = useTranslations('admin.REPORT_REVIEW_DIALOG');
	const [isLoading, setIsLoading] = useState(false);
	const [status, setStatus] = useState<ReportStatusValues>(report.status);
	const [resolution, setResolution] = useState<ReportResolutionValues | ''>(report.resolution || '');
	const [reviewNote, setReviewNote] = useState(report.reviewNote || '');

	useEffect(() => {
		setStatus(report.status);
		setResolution(report.resolution || '');
		setReviewNote(report.reviewNote || '');
	}, [report.id, report.status, report.resolution, report.reviewNote]);

	const handleSubmit = async () => {
		setIsLoading(true);
		try {
			const updateData: UpdateReportParams = { status, reviewNote: reviewNote.trim() || undefined };
			if (resolution) updateData.resolution = resolution as ReportResolutionValues;
			const success = await onUpdate(report.id, updateData);
			if (success) onClose();
		} catch (error) {
			console.error('Error updating report:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 [&::-webkit-scrollbar]:w-1"
			onClick={(e) => e.target === e.currentTarget && !isLoading && onOpenChange(false)}
		>
			<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 w-full max-w-lg my-8">
				{/* Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center shrink-0">
							<Flag className="w-4 h-4 text-gray-500 dark:text-gray-400" />
						</div>
						<div>
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h2>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
						aria-label="Close"
						className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="p-5 space-y-4">
					{/* Flat meta row */}
					<div className="grid grid-cols-2 gap-x-6 gap-y-3">
						<div className="flex items-center gap-2 min-w-0">
							<FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
							<div className="min-w-0">
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('CONTENT_TYPE')}</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white capitalize truncate">{report.contentType}</p>
							</div>
						</div>
						<div className="flex items-center gap-2 min-w-0">
							<User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
							<div className="min-w-0">
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('REPORTED_BY')}</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
									{report.reporter?.name || report.reporter?.email || t('UNKNOWN')}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2 min-w-0">
							<FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
							<div className="min-w-0">
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('CONTENT_ID')}</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white truncate">{report.contentId}</p>
							</div>
						</div>
						<div className="flex items-center gap-2 min-w-0">
							<Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
							<div className="min-w-0">
								<p className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('DATE')}</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(report.createdAt)}</p>
							</div>
						</div>
					</div>

					{/* Reason + Details inline */}
					<div className="pt-3 border-t border-gray-100 dark:border-white/6 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('REASON')}</span>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20 capitalize">
								{report.reason}
							</span>
						</div>
						{report.details && (
							<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{report.details}</p>
						)}
					</div>

					{/* Divider */}
					<div className="h-px bg-gray-100 dark:bg-white/6" />

					{/* Status */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('STATUS')}</label>
						<select
							value={status}
							onChange={(e) => setStatus(e.target.value as ReportStatusValues)}
							disabled={isLoading}
							className={INPUT_BASE}
						>
							{STATUS_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>

					{/* Resolution */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('RESOLUTION')}</label>
						<select
							value={resolution}
							onChange={(e) => setResolution(e.target.value as ReportResolutionValues | '')}
							disabled={isLoading}
							className={INPUT_BASE}
						>
							<option value="">{t('SELECT_RESOLUTION')}</option>
							{RESOLUTION_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>{opt.label} — {opt.description}</option>
							))}
						</select>
					</div>

					{/* Review Note */}
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('REVIEW_NOTE')}</label>
						<textarea
							value={reviewNote}
							onChange={(e) => setReviewNote(e.target.value)}
							placeholder={t('REVIEW_NOTE_PLACEHOLDER')}
							rows={3}
							disabled={isLoading}
							className={cn(
								'w-full px-3 py-2.5 text-sm rounded-xl resize-none',
								'bg-white dark:bg-white/5',
								'border border-gray-200 dark:border-white/8',
								'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
								'focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-400 dark:focus:border-white/20',
								'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
							)}
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-white/8 bg-gray-50/60 dark:bg-white/1.5">
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/6 transition-colors disabled:opacity-50"
					>
						<X className="w-3.5 h-3.5" />
						{t('CANCEL')}
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={isLoading}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950"
					>
						{isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
						{isLoading ? t('UPDATING') : t('UPDATE_REPORT')}
					</button>
				</div>
			</div>
		</div>
	);
}
