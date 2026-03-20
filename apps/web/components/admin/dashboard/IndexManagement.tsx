'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, Database, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useLocationIndexAction, type RebuildIndexResult } from '@/hooks/use-geo-analytics';

// ===================== Style Constants =====================

const CARD_STYLES = 'bg-white dark:bg-[#0a0a0a] rounded-xl shadow-xs border border-gray-200 dark:border-white/6 p-4 md:p-6';
const HEADER_STYLES = 'flex items-center gap-2 mb-3';
const TITLE_STYLES = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
const DESCRIPTION_STYLES = 'text-sm text-gray-500 dark:text-gray-400 mb-4';
const META_STYLES = 'flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-4';
const ACTIONS_STYLES = 'flex flex-wrap gap-3';
const MESSAGE_BASE_STYLES = 'mt-4 text-sm p-3 rounded-lg';
const MESSAGE_SUCCESS_STYLES = 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
const MESSAGE_ERROR_STYLES = 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';

// ===================== Helpers =====================

function isRebuildResult(data: unknown): data is RebuildIndexResult {
	return typeof data === 'object' && data !== null && 'indexed' in data && 'skipped' in data;
}

function isClearResult(data: unknown): data is { cleared: number } {
	return typeof data === 'object' && data !== null && 'cleared' in data;
}

function formatTimestamp(isoString: string | null): string | null {
	if (!isoString) return null;
	try {
		return new Date(isoString).toLocaleString();
	} catch {
		return null;
	}
}

// ===================== Props =====================

interface IndexManagementProps {
	lastRebuildAt: string | null;
	totalIndexed: number;
}

// ===================== Component =====================

export function IndexManagement({ lastRebuildAt, totalIndexed }: IndexManagementProps) {
	const t = useTranslations('admin.DASHBOARD.GEO');
	const mutation = useLocationIndexAction();
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	const handleRebuild = () => {
		setMessage(null);
		mutation.mutate('rebuild', {
			onSuccess: (data) => {
				if (isRebuildResult(data)) {
					setMessage({
						type: 'success',
						text: t('REBUILD_SUCCESS', {
							indexed: data.indexed,
							skipped: data.skipped,
							duration: data.durationMs,
						}),
					});
				}
			},
			onError: () => {
				setMessage({ type: 'error', text: t('ACTION_FAILED') });
			},
		});
	};

	const handleClear = () => {
		const confirmed = window.confirm(t('CLEAR_CONFIRM'));
		if (!confirmed) return;

		setMessage(null);
		mutation.mutate('clear', {
			onSuccess: (data) => {
				if (isClearResult(data)) {
					setMessage({
						type: 'success',
						text: t('CLEAR_SUCCESS', { cleared: data.cleared }),
					});
				}
			},
			onError: () => {
				setMessage({ type: 'error', text: t('ACTION_FAILED') });
			},
		});
	};

	const formattedLastRebuild = formatTimestamp(lastRebuildAt);

	return (
		<div className={CARD_STYLES}>
			{/* Header */}
			<div className={HEADER_STYLES}>
				<Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
				<h3 className={TITLE_STYLES}>{t('INDEX_MANAGEMENT')}</h3>
			</div>

			{/* Description */}
			<p className={DESCRIPTION_STYLES}>{t('INDEX_DESCRIPTION')}</p>

			{/* Metadata */}
			<div className={META_STYLES}>
				<Clock className="w-3 h-3" />
				<span>
					{t('LAST_REBUILD')}: {formattedLastRebuild ?? t('NEVER_REBUILT')}
				</span>
				<span className="mx-1">|</span>
				<span>
					{t('TOTAL_INDEXED')}: {totalIndexed}
				</span>
			</div>

			{/* Actions */}
			<div className={ACTIONS_STYLES}>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRebuild}
					disabled={mutation.isPending}
					className="flex items-center gap-2"
				>
					<RefreshCw className={mutation.isPending ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
					{t('REBUILD_INDEX')}
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={handleClear}
					disabled={mutation.isPending}
					className="flex items-center gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
				>
					<Trash2 className="w-4 h-4" />
					{t('CLEAR_INDEX')}
				</Button>
			</div>

			{/* Status Message */}
			{message && (
				<div
					className={`${MESSAGE_BASE_STYLES} ${
						message.type === 'success' ? MESSAGE_SUCCESS_STYLES : MESSAGE_ERROR_STYLES
					}`}
				>
					{message.text}
				</div>
			)}
		</div>
	);
}
