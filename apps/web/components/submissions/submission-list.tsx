'use client';

import { useTranslations } from 'next-intl';
import { FiFileText, FiPlus, FiSearch, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { SubmissionItem, SubmissionItemSkeleton, toSubmission } from './submission-item';
import { ClientSubmissionData } from '@/lib/types/client-item';
import { cn } from '@/lib/utils';

export interface SubmissionListProps {
	items: ClientSubmissionData[];
	isLoading?: boolean;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onView?: (id: string) => void;
	deletingId?: string | null;
	updatingId?: string | null;
	emptyStateTitle?: string;
	emptyStateDescription?: string;
	emptyStateActionLabel?: string;
	emptyStateActionHref?: string;
	skeletonCount?: number;
	hasActiveFilters?: boolean;
	onClearFilters?: () => void;
	error?: { message?: string } | null;
	onRetry?: () => void;
}

export function SubmissionList({
	items,
	isLoading = false,
	onEdit,
	onDelete,
	onView,
	deletingId,
	updatingId,
	emptyStateTitle,
	emptyStateDescription,
	emptyStateActionLabel,
	emptyStateActionHref = '/submit',
	skeletonCount = 5,
	hasActiveFilters = false,
	onClearFilters,
	error = null,
	onRetry,
}: SubmissionListProps) {
	const t = useTranslations('client.submissions');

	const title = emptyStateTitle || t('NO_SUBMISSIONS_TITLE');
	const description = emptyStateDescription || t('NO_SUBMISSIONS_DESC');
	const actionLabel = emptyStateActionLabel || t('SUBMIT_FIRST_PROJECT');

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
				<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20">
					<FiAlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
				</div>
				<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('ERROR_TITLE')}</h3>
				<p className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
					{error.message || t('ERROR_DESC')}
				</p>
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className={cn(
							'mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700',
							'transition-colors hover:bg-gray-50',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40',
							'dark:border-white/8 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/8'
						)}
					>
						<FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
						{t('TRY_AGAIN')}
					</button>
				)}
			</div>
		);
	}

	if (isLoading) {
		return (
			<div id="submissions-list" role="region" aria-busy="true" aria-live="polite">
				<TableHeader />
				<div className="space-y-3 md:space-y-0">
					{Array.from({ length: skeletonCount }).map((_, index) => (
						<SubmissionItemSkeleton key={index} />
					))}
				</div>
			</div>
		);
	}

	if (items.length === 0) {
		const isFiltered = hasActiveFilters;
		return (
			<div className="flex flex-col items-center justify-center px-6 py-14 text-center">
				<div
					className={cn(
						'mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl',
						isFiltered
							? 'bg-gray-100 dark:bg-white/5'
							: 'bg-theme-primary-50 dark:bg-theme-primary-900/30'
					)}
				>
					{isFiltered ? (
						<FiSearch className="h-6 w-6 text-gray-500 dark:text-gray-400" aria-hidden="true" />
					) : (
						<FiFileText
							className="h-6 w-6 text-theme-primary-600 dark:text-theme-primary-400"
							aria-hidden="true"
						/>
					)}
				</div>
				<h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
					{isFiltered ? t('NO_RESULTS_TITLE') : title}
				</h3>
				<p className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
					{isFiltered ? t('NO_RESULTS_DESC') : description}
				</p>
				<div className="mt-5 flex items-center gap-2">
					{isFiltered && onClearFilters && (
						<button
							type="button"
							onClick={onClearFilters}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700',
								'transition-colors hover:bg-gray-50',
								'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40',
								'dark:border-white/8 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/8'
							)}
						>
							{t('CLEAR_FILTERS')}
						</button>
					)}
					{!isFiltered && emptyStateActionHref && (
						<Link
							href={emptyStateActionHref}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-lg bg-theme-primary-600 px-3 py-1.5 text-xs font-semibold text-white',
								'shadow-sm transition-colors hover:bg-theme-primary-700',
								'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
							)}
						>
							<FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
							{actionLabel}
						</Link>
					)}
				</div>
			</div>
		);
	}

	return (
		<div id="submissions-list" role="region" aria-live="polite">
			<TableHeader />
			<div className="space-y-3 md:space-y-0" role="rowgroup">
				{items.map((item) => {
					const submission = toSubmission(item);
					return (
						<SubmissionItem
							key={item.id}
							submission={submission}
							onEdit={onEdit}
							onDelete={onDelete}
							onView={onView}
							isDeleting={deletingId === item.id}
							isUpdating={updatingId === item.id}
							disabled={!!deletingId || !!updatingId}
						/>
					);
				})}
			</div>
		</div>
	);
}

function TableHeader() {
	const t = useTranslations('client.submissions');
	return (
		<div
			role="row"
			className="hidden md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_120px_120px] items-center gap-4 border-b border-gray-200 px-4 py-2 dark:border-white/8"
		>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{t('COL_SUBMISSION')}
			</div>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{t('COL_STATUS')}
			</div>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{t('COL_CATEGORY')}
			</div>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{t('COL_METRICS')}
			</div>
			<div className="text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{t('COL_ACTIONS')}
			</div>
		</div>
	);
}

export interface SubmissionListWithPaginationProps extends SubmissionListProps {
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}

export function SubmissionListWithInfo({
	items,
	total,
	page,
	totalPages,
	limit,
	...props
}: SubmissionListWithPaginationProps) {
	const t = useTranslations('client.submissions');
	const start = (page - 1) * limit + 1;
	const end = Math.min(page * limit, total);

	return (
		<div className="space-y-4">
			{total > 0 && (
				<div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
					<span>{t('SHOWING_RESULTS', { start, end, total })}</span>
					{totalPages > 1 && <span>{t('PAGE_INFO', { page, totalPages })}</span>}
				</div>
			)}
			<SubmissionList items={items} {...props} />
		</div>
	);
}
