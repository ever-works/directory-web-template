'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
	FiClock,
	FiEye,
	FiEdit,
	FiTrash2,
	FiTrendingUp,
	FiCheck,
	FiX,
	FiLoader,
	FiTag,
	FiFolder,
} from 'react-icons/fi';
import { IconType } from 'react-icons';
import { ClientSubmissionData } from '@/lib/types/client-item';
import { cn } from '@/lib/utils';

export interface Submission {
	id: string;
	title: string;
	description: string;
	status: 'approved' | 'pending' | 'rejected';
	submittedAt: string | null;
	approvedAt?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	category: string;
	tags: string[];
	views: number;
	likes: number;
	source_url?: string;
}

type StatusKey = Submission['status'];

interface StatusConfigItem {
	labelKey: string;
	icon: IconType;
	chip: string;
	dot: string;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfigItem> = {
	approved: {
		labelKey: 'STATUS_APPROVED',
		icon: FiCheck,
		chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60',
		dot: 'bg-emerald-500',
	},
	pending: {
		labelKey: 'STATUS_PENDING',
		icon: FiClock,
		chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/60',
		dot: 'bg-amber-500',
	},
	rejected: {
		labelKey: 'STATUS_REJECTED',
		icon: FiX,
		chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/60',
		dot: 'bg-rose-500',
	},
};

export interface SubmissionStatusBadgeProps {
	status: StatusKey;
	className?: string;
	withDot?: boolean;
}

export function SubmissionStatusBadge({ status, className, withDot = false }: SubmissionStatusBadgeProps) {
	const t = useTranslations('client.submissions');
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
				config.chip,
				className
			)}
		>
			{withDot ? (
				<span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden="true" />
			) : (
				<Icon className="h-3 w-3" aria-hidden="true" />
			)}
			{t(config.labelKey)}
		</span>
	);
}

export interface SubmissionItemProps {
	submission: Submission;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onView?: (id: string) => void;
	isDeleting?: boolean;
	isUpdating?: boolean;
	disabled?: boolean;
}

function formatDate(dateString: string, locale: string, fallback: string): string {
	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return fallback;
		return date.toLocaleDateString(locale, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return fallback;
	}
}

interface ActionButtonProps {
	icon: IconType;
	label: string;
	onClick?: () => void;
	disabled: boolean;
	loading?: boolean;
	tone?: 'default' | 'destructive';
}

function ActionButton({ icon: Icon, label, onClick, disabled, loading = false, tone = 'default' }: ActionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			title={label}
			className={cn(
				'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
				'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
				'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/8',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40',
				'disabled:cursor-not-allowed disabled:opacity-50',
				tone === 'destructive' &&
					'hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-900/20'
			)}
		>
			{loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
		</button>
	);
}

export function SubmissionItem({
	submission,
	onEdit,
	onDelete,
	onView,
	isDeleting = false,
	isUpdating = false,
	disabled = false,
}: SubmissionItemProps) {
	const t = useTranslations('client.submissions');
	const locale = useLocale();
	const isLoading = isDeleting || isUpdating;
	const isDisabled = disabled || isLoading;
	const submittedLabel = submission.submittedAt
		? formatDate(submission.submittedAt, locale, t('INVALID_DATE'))
		: t('NA');

	return (
		<>
			{/* Desktop row (md+) — table-style layout */}
			<div
				className={cn(
					'group hidden md:grid items-center gap-4 px-4 py-3 transition-colors',
					'md:grid-cols-[minmax(0,1fr)_140px_140px_120px_120px]',
					'hover:bg-gray-50 dark:hover:bg-white/3',
					'border-b border-gray-100 dark:border-white/6 last:border-b-0',
					isDisabled && 'opacity-60 pointer-events-none'
				)}
				role="row"
			>
				<div className="min-w-0">
					<button
						type="button"
						onClick={onView ? () => onView(submission.id) : undefined}
						disabled={isDisabled}
						className={cn(
							'block w-full text-left',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40 rounded-sm'
						)}
					>
						<h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-theme-primary-700 dark:group-hover:text-theme-primary-400 transition-colors">
							{submission.title}
						</h3>
						<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
							{submission.description}
						</p>
					</button>
					{submission.tags.length > 0 && (
						<div className="mt-1.5 flex flex-wrap items-center gap-1">
							{submission.tags.slice(0, 3).map((tag) => (
								<span
									key={tag}
									className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400"
								>
									{tag}
								</span>
							))}
							{submission.tags.length > 3 && (
								<span className="text-[10px] text-gray-500 dark:text-gray-500">
									{t('MORE_TAGS', { count: submission.tags.length - 3 })}
								</span>
							)}
						</div>
					)}
				</div>

				<div className="min-w-0">
					<SubmissionStatusBadge status={submission.status} />
				</div>

				<div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
					<FiFolder className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
					<span className="truncate">{submission.category}</span>
				</div>

				<div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
					<span className="inline-flex items-center gap-1" title={t('VIEWS')}>
						<FiEye className="h-3 w-3" aria-hidden="true" />
						{submission.views.toLocaleString()}
					</span>
					{submission.status === 'approved' && (
						<span className="inline-flex items-center gap-1" title={t('LIKES')}>
							<FiTrendingUp className="h-3 w-3" aria-hidden="true" />
							{submission.likes.toLocaleString()}
						</span>
					)}
				</div>

				<div className="flex items-center justify-between gap-2">
					<span className="truncate text-xs text-gray-500 dark:text-gray-400">{submittedLabel}</span>
					<div className="flex shrink-0 items-center gap-0.5">
						<ActionButton
							icon={FiEye}
							label={t('VIEW_SUBMISSION')}
							onClick={onView ? () => onView(submission.id) : undefined}
							disabled={isDisabled}
						/>
						<ActionButton
							icon={FiEdit}
							label={t('EDIT_SUBMISSION')}
							onClick={onEdit ? () => onEdit(submission.id) : undefined}
							disabled={isDisabled}
							loading={isUpdating}
						/>
						<ActionButton
							icon={FiTrash2}
							label={t('DELETE_SUBMISSION')}
							onClick={onDelete ? () => onDelete(submission.id) : undefined}
							disabled={isDisabled}
							loading={isDeleting}
							tone="destructive"
						/>
					</div>
				</div>
			</div>

			{/* Mobile card (<md) */}
			<div
				className={cn(
					'md:hidden group rounded-xl border border-gray-200 bg-white p-4 transition-colors',
					'dark:border-white/8 dark:bg-[#111111]',
					'hover:border-gray-300 dark:hover:border-white/12',
					isDisabled && 'opacity-60 pointer-events-none'
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<button
						type="button"
						onClick={onView ? () => onView(submission.id) : undefined}
						disabled={isDisabled}
						className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40 rounded-sm"
					>
						<h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
							{submission.title}
						</h3>
						<p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
							{submission.description}
						</p>
					</button>
					<SubmissionStatusBadge status={submission.status} className="shrink-0" />
				</div>

				<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
					<span className="inline-flex items-center gap-1">
						<FiFolder className="h-3 w-3" aria-hidden="true" />
						{submission.category}
					</span>
					<span className="inline-flex items-center gap-1">
						<FiClock className="h-3 w-3" aria-hidden="true" />
						{submittedLabel}
					</span>
					<span className="inline-flex items-center gap-1 tabular-nums">
						<FiEye className="h-3 w-3" aria-hidden="true" />
						{submission.views.toLocaleString()}
					</span>
					{submission.status === 'approved' && (
						<span className="inline-flex items-center gap-1 tabular-nums">
							<FiTrendingUp className="h-3 w-3" aria-hidden="true" />
							{submission.likes.toLocaleString()}
						</span>
					)}
				</div>

				{submission.tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{submission.tags.slice(0, 4).map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400"
							>
								<FiTag className="h-2.5 w-2.5" aria-hidden="true" />
								{tag}
							</span>
						))}
						{submission.tags.length > 4 && (
							<span className="text-[10px] text-gray-500 dark:text-gray-500">
								{t('MORE_TAGS', { count: submission.tags.length - 4 })}
							</span>
						)}
					</div>
				)}

				{submission.status === 'rejected' && submission.rejectionReason && (
					<div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-300">
						<strong className="font-semibold">{t('REJECTION_REASON')}:</strong>{' '}
						{submission.rejectionReason}
					</div>
				)}

				<div className="mt-3 flex items-center justify-end gap-0.5 border-t border-gray-100 pt-2 dark:border-white/6">
					<ActionButton
						icon={FiEye}
						label={t('VIEW_SUBMISSION')}
						onClick={onView ? () => onView(submission.id) : undefined}
						disabled={isDisabled}
					/>
					<ActionButton
						icon={FiEdit}
						label={t('EDIT_SUBMISSION')}
						onClick={onEdit ? () => onEdit(submission.id) : undefined}
						disabled={isDisabled}
						loading={isUpdating}
					/>
					<ActionButton
						icon={FiTrash2}
						label={t('DELETE_SUBMISSION')}
						onClick={onDelete ? () => onDelete(submission.id) : undefined}
						disabled={isDisabled}
						loading={isDeleting}
						tone="destructive"
					/>
				</div>
			</div>
		</>
	);
}

export function toSubmission(item: ClientSubmissionData): Submission {
	const approvedAt = item.status === 'approved' ? item.reviewed_at : undefined;
	const rejectedAt = item.status === 'rejected' ? item.reviewed_at : undefined;

	return {
		id: item.id,
		title: item.name,
		description: item.description,
		status: (['approved', 'pending', 'rejected'].includes(item.status)
			? item.status
			: 'pending') as Submission['status'],
		submittedAt: item.submitted_at || item.updated_at || null,
		approvedAt,
		rejectedAt,
		rejectionReason: item.review_notes,
		category: Array.isArray(item.category) ? item.category[0] || 'Uncategorized' : item.category || 'Uncategorized',
		tags: item.tags || [],
		views: item.views || 0,
		likes: item.likes || 0,
		source_url: item.source_url,
	};
}

export function SubmissionItemSkeleton() {
	return (
		<>
			<div
				className="hidden md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_120px_120px] items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-white/6"
				aria-hidden="true"
			>
				<div className="space-y-2">
					<div className="h-4 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
					<div className="h-3 w-1/2 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
				</div>
				<div className="h-5 w-20 animate-pulse rounded-full bg-gray-200/70 dark:bg-white/8" />
				<div className="h-3 w-24 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
				<div className="h-3 w-16 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
				<div className="flex items-center justify-between gap-2">
					<div className="h-3 w-16 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
					<div className="flex gap-1">
						<div className="h-7 w-7 animate-pulse rounded-md bg-gray-200/70 dark:bg-white/8" />
						<div className="h-7 w-7 animate-pulse rounded-md bg-gray-200/70 dark:bg-white/8" />
						<div className="h-7 w-7 animate-pulse rounded-md bg-gray-200/70 dark:bg-white/8" />
					</div>
				</div>
			</div>
			<div
				className="md:hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#111111]"
				aria-hidden="true"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 space-y-2">
						<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
						<div className="h-3 w-full animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
						<div className="h-3 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
					</div>
					<div className="h-5 w-20 animate-pulse rounded-full bg-gray-200/70 dark:bg-white/8" />
				</div>
				<div className="mt-3 flex gap-2">
					<div className="h-3 w-16 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
					<div className="h-3 w-20 animate-pulse rounded bg-gray-200/70 dark:bg-white/8" />
				</div>
			</div>
		</>
	);
}
