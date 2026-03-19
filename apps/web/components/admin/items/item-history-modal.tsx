'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import * as Select from '@radix-ui/react-select';
import {
	Clock,
	Plus,
	Edit2,
	RefreshCw,
	CheckCircle,
	XCircle,
	Trash2,
	RotateCcw,
	ChevronDown,
	ChevronUp,
	X,
	Filter,
	Check
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useItemHistory, type ItemAuditLogEntry } from '@/hooks/use-item-history';
import { ItemAuditAction, type ItemAuditActionValues } from '@/lib/db/schema';
import { UniversalPagination } from '@/components/universal-pagination';
import { cn } from '@/lib/utils';

// ===================== Constants =====================

const MODAL_OVERLAY = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
const MODAL_CONTAINER = 'w-full max-w-2xl bg-white dark:bg-white/[0.03] rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col';
const MODAL_HEADER = 'bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 shrink-0';
const MODAL_BODY = 'p-6 overflow-y-auto flex-1';

const ACTION_CONFIG: Record<
	ItemAuditActionValues,
	{ icon: typeof Clock; color: string; bgColor: string; borderColor: string }
> = {
	[ItemAuditAction.CREATED]: {
		icon: Plus,
		color: 'text-green-600 dark:text-green-400',
		bgColor: 'bg-green-100 dark:bg-green-900/20',
		borderColor: 'border-green-300 dark:border-green-700'
	},
	[ItemAuditAction.UPDATED]: {
		icon: Edit2,
		color: 'text-blue-600 dark:text-blue-400',
		bgColor: 'bg-blue-100 dark:bg-blue-900/20',
		borderColor: 'border-blue-300 dark:border-blue-700'
	},
	[ItemAuditAction.STATUS_CHANGED]: {
		icon: RefreshCw,
		color: 'text-yellow-600 dark:text-yellow-400',
		bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
		borderColor: 'border-yellow-300 dark:border-yellow-700'
	},
	[ItemAuditAction.REVIEWED]: {
		icon: CheckCircle,
		color: 'text-purple-600 dark:text-purple-400',
		bgColor: 'bg-purple-100 dark:bg-purple-900/20',
		borderColor: 'border-purple-300 dark:border-purple-700'
	},
	[ItemAuditAction.DELETED]: {
		icon: Trash2,
		color: 'text-red-600 dark:text-red-400',
		bgColor: 'bg-red-100 dark:bg-red-900/20',
		borderColor: 'border-red-300 dark:border-red-700'
	},
	[ItemAuditAction.RESTORED]: {
		icon: RotateCcw,
		color: 'text-teal-600 dark:text-teal-400',
		bgColor: 'bg-teal-100 dark:bg-teal-900/20',
		borderColor: 'border-teal-300 dark:border-teal-700'
	}
};

// ===================== Props =====================

interface ItemHistoryModalProps {
	isOpen: boolean;
	itemId: string;
	itemName: string;
	onClose: () => void;
}

// ===================== Helper Components =====================

function RelativeTime({ date }: { date: string }) {
	const t = useTranslations('admin.ITEM_HISTORY');
	const now = new Date();
	const then = new Date(date);
	const diffMs = now.getTime() - then.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	let relativeText: string;
	if (diffMins < 1) {
		relativeText = t('JUST_NOW');
	} else if (diffMins < 60) {
		relativeText = t('MINUTES_AGO', { count: diffMins });
	} else if (diffHours < 24) {
		relativeText = t('HOURS_AGO', { count: diffHours });
	} else {
		relativeText = t('DAYS_AGO', { count: diffDays });
	}

	return (
		<span title={then.toLocaleString()} className="text-xs text-gray-500 dark:text-gray-400">
			{relativeText}
		</span>
	);
}

function ChangeItem({ field, old, newValue }: { field: string; old: unknown; newValue: unknown }) {
	const formatValue = (val: unknown): string => {
		if (val === null || val === undefined) return '—';
		if (Array.isArray(val)) return val.join(', ') || '—';
		if (typeof val === 'boolean') return val ? 'Yes' : 'No';
		return String(val);
	};

	return (
		<div className="flex items-center gap-1.5 text-xs py-0.5">
			<span className="text-gray-500 dark:text-gray-400 font-medium min-w-[60px]">{field}:</span>
			<span className="text-red-500 dark:text-red-400 line-through truncate max-w-[100px]">{formatValue(old)}</span>
			<span className="text-gray-400">→</span>
			<span className="text-green-500 dark:text-green-400 truncate max-w-[100px]">{formatValue(newValue)}</span>
		</div>
	);
}

function HistoryEntry({ entry }: { entry: ItemAuditLogEntry }) {
	const t = useTranslations('admin.ITEM_HISTORY');
	const [expanded, setExpanded] = useState(false);

	const changes = entry.changes ? Object.entries(entry.changes) : [];
	const hasChanges = changes.length > 0;

	// For "reviewed" action, show the outcome (Approved/Rejected) instead of generic "Reviewed"
	const getActionLabel = (): string => {
		if (entry.action === ItemAuditAction.REVIEWED && entry.newStatus) {
			if (entry.newStatus === 'approved') return t('ACTION_APPROVED');
			if (entry.newStatus === 'rejected') return t('ACTION_REJECTED');
		}

		switch (entry.action) {
			case ItemAuditAction.CREATED:
				return t('ACTION_CREATED');
			case ItemAuditAction.UPDATED:
				return t('ACTION_UPDATED');
			case ItemAuditAction.STATUS_CHANGED:
				return t('ACTION_STATUS_CHANGED');
			case ItemAuditAction.REVIEWED:
				return t('ACTION_REVIEWED');
			case ItemAuditAction.DELETED:
				return t('ACTION_DELETED');
			case ItemAuditAction.RESTORED:
				return t('ACTION_RESTORED');
			default:
				return entry.action;
		}
	};

	// Get config based on action, but override for reviewed with specific status
	const getConfig = () => {
		if (entry.action === ItemAuditAction.REVIEWED && entry.newStatus) {
			if (entry.newStatus === 'approved') {
				return {
					icon: CheckCircle,
					color: 'text-green-600 dark:text-green-400',
					bgColor: 'bg-green-100 dark:bg-green-900/20'
				};
			}
			if (entry.newStatus === 'rejected') {
				return {
					icon: XCircle,
					color: 'text-red-600 dark:text-red-400',
					bgColor: 'bg-red-100 dark:bg-red-900/20'
				};
			}
		}
		return ACTION_CONFIG[entry.action];
	};

	const config = getConfig();
	const Icon = config.icon;
	const actionLabel = getActionLabel();

	// Check if this is a rejection (to show "Reason:" label)
	const isRejection = entry.action === ItemAuditAction.REVIEWED && entry.newStatus === 'rejected';

	// Get performer display name
	const performerName = entry.performedByName || entry.performer?.email || t('SYSTEM');

	return (
		<div className="flex gap-3 py-3">
			{/* Icon */}
			<div className={cn('flex items-center justify-center w-7 h-7 rounded-full shrink-0', config.bgColor)}>
				<Icon className={cn('w-3.5 h-3.5', config.color)} />
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				{/* Main row: Action + Previous Status + Time */}
				<div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-sm">
					<span className={cn('font-medium', config.color)}>{actionLabel}</span>
					{entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus && (
						<span className="text-gray-400 dark:text-gray-500 text-xs">
							({t('WAS_STATUS', { status: entry.previousStatus })})
						</span>
					)}
					<span className="text-gray-300 dark:text-gray-600">•</span>
					<RelativeTime date={entry.createdAt} />
				</div>

				{/* User - with "by" prefix */}
				<div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					{t('BY_USER', { name: performerName })}
				</div>

				{/* Notes - with label for rejection reason */}
				{entry.notes && (
					<p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
						{isRejection && (
							<span className="font-medium text-gray-500 dark:text-gray-400">{t('REASON_LABEL')} </span>
						)}
						<span className="italic">"{entry.notes}"</span>
					</p>
				)}

				{/* Changes toggle */}
				{hasChanges && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className="flex items-center gap-1 mt-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
					>
						{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
						{t('VIEW_CHANGES', { count: changes.length })}
					</button>
				)}

				{/* Expanded changes */}
				{expanded && hasChanges && (
					<div className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-white/[0.06] space-y-1">
						{changes.map(([field, { old, new: newVal }]) => (
							<ChangeItem key={field} field={field} old={old} newValue={newVal} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ===================== Filter Dropdown =====================

const ACTION_FILTERS: ItemAuditActionValues[] = [
	ItemAuditAction.CREATED,
	ItemAuditAction.UPDATED,
	ItemAuditAction.STATUS_CHANGED,
	ItemAuditAction.REVIEWED,
	ItemAuditAction.DELETED,
	ItemAuditAction.RESTORED
];

function ActionFilterSelect({
	selected,
	onChange
}: {
	selected: ItemAuditActionValues | null;
	onChange: (action: ItemAuditActionValues | null) => void;
}) {
	const t = useTranslations('admin.ITEM_HISTORY');

	const getActionLabel = (action: ItemAuditActionValues): string => {
		switch (action) {
			case ItemAuditAction.CREATED:
				return t('ACTION_CREATED');
			case ItemAuditAction.UPDATED:
				return t('ACTION_UPDATED');
			case ItemAuditAction.STATUS_CHANGED:
				return t('ACTION_STATUS_CHANGED');
			case ItemAuditAction.REVIEWED:
				return t('ACTION_REVIEWED');
			case ItemAuditAction.DELETED:
				return t('ACTION_DELETED');
			case ItemAuditAction.RESTORED:
				return t('ACTION_RESTORED');
			default:
				return action;
		}
	};

	return (
		<div className="mb-4">
			<Select.Root
				value={selected || 'all'}
				onValueChange={(value) => {
					if (value === 'all') {
						onChange(null);
					} else {
						onChange(value as ItemAuditActionValues);
					}
				}}
			>
				<Select.Trigger
					className={cn(
						'flex h-9 w-[200px] items-center justify-between rounded-md border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] px-3 py-2 text-sm',
						'focus:outline-none focus:ring-2 focus:ring-blue-500',
						'disabled:cursor-not-allowed disabled:opacity-50'
					)}
				>
					<div className="flex items-center gap-2">
						<Filter className="w-4 h-4 text-gray-400" />
						<Select.Value placeholder={t('FILTER_ALL')} />
					</div>
					<Select.Icon>
						<ChevronDown className="h-4 w-4 opacity-50" />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Content
						className="overflow-hidden bg-white dark:bg-white/[0.05] rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.06] z-50"
						position="popper"
						sideOffset={4}
					>
						<Select.Viewport className="p-1">
							<Select.Item
								value="all"
								className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.06] outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
							>
								<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
									<Check className="h-4 w-4" />
								</Select.ItemIndicator>
								<Select.ItemText>{t('FILTER_ALL')}</Select.ItemText>
							</Select.Item>
							{ACTION_FILTERS.map((action) => (
								<Select.Item
									key={action}
									value={action}
									className="relative flex items-center px-8 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.06] outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700"
								>
									<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
										<Check className="h-4 w-4" />
									</Select.ItemIndicator>
									<Select.ItemText>{getActionLabel(action)}</Select.ItemText>
								</Select.Item>
							))}
						</Select.Viewport>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</div>
	);
}

// ===================== Main Component =====================

export function ItemHistoryModal({ isOpen, itemId, itemName, onClose }: ItemHistoryModalProps) {
	const t = useTranslations('admin.ITEM_HISTORY');
	const [page, setPage] = useState(1);
	const [actionFilter, setActionFilter] = useState<ItemAuditActionValues | null>(null);

	const { data, isLoading, isError, error } = useItemHistory({
		itemId,
		page,
		limit: 10,
		actionFilter: actionFilter ? [actionFilter] : undefined,
		enabled: isOpen
	});

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [actionFilter]);

	// Reset state when opening for a new item
	useEffect(() => {
		if (!isOpen) return;
		setPage(1);
		setActionFilter(null);
	}, [isOpen, itemId]);

	// Handle Escape key to close modal
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, onClose]);

	// Handle click outside to close
	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div className={MODAL_OVERLAY} onClick={handleOverlayClick}>
			<div className={MODAL_CONTAINER} role="dialog" aria-modal="true">
				{/* Header */}
				<div className={MODAL_HEADER}>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
								<Clock className="h-6 w-6 text-white" />
							</div>
							<div>
								<h2 className="text-xl font-semibold text-white">{t('TITLE')}</h2>
								<p className="text-sm text-white/80 truncate max-w-xs">{itemName}</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
							aria-label="Close"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className={MODAL_BODY}>
					{/* Filter */}
					<ActionFilterSelect selected={actionFilter} onChange={setActionFilter} />

					{/* Loading State */}
					{isLoading && (
						<div className="flex items-center justify-center py-12">
							<Spinner size="lg" color="primary" />
						</div>
					)}

					{/* Error State */}
					{isError && (
						<div className="text-center py-12">
							<p className="text-red-500">{t('ERROR_LOADING')}</p>
							<p className="text-sm text-gray-500 mt-1">{error?.message}</p>
						</div>
					)}

					{/* Empty State */}
					{!isLoading && !isError && data?.logs.length === 0 && (
						<div className="text-center py-12">
							<Clock className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
							<p className="text-gray-500 dark:text-gray-400">{t('NO_HISTORY')}</p>
						</div>
					)}

					{/* History List */}
					{!isLoading && !isError && data && data.logs.length > 0 && (
						<div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
							{data.logs.map((entry) => (
								<HistoryEntry key={entry.id} entry={entry} />
							))}
						</div>
					)}
				</div>

				{/* Pagination Footer */}
				{data && data.totalPages > 1 && (
					<div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] shrink-0">
						<UniversalPagination
							page={page}
							totalPages={data.totalPages}
							onPageChange={setPage}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
