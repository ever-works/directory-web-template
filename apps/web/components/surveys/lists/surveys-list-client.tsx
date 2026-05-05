'use client';

import React from 'react';
import Link from 'next/link';
import type { Survey } from '@/lib/db/schema';
import { getStatusColor, getTypeColor, getPublicSurveyLink, copyToClipboard, formatSurveyTypeLabel, formatSurveyStatusLabel } from '../utils/survey-helpers';
import { toast } from 'sonner';
import { Copy, Eye, FileText, ClipboardList } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';

interface SurveysListClientProps {
	surveys: Survey[];
	loading: boolean;
	showTypeColumn?: boolean;
	showResponsesColumn?: boolean;
	showUpdatedColumn?: boolean;
	emptyMessage?: string;
	emptySubMessage?: string;
	getResponsesLink?: (survey: Survey) => string;
	getPreviewLink?: (survey: Survey) => string;
	additionalActions?: (survey: Survey) => React.ReactNode;
}

export function SurveysListClient({
	surveys,
	loading,
	showTypeColumn = false,
	showResponsesColumn = false,
	showUpdatedColumn = false,
	emptyMessage = 'No surveys found.',
	emptySubMessage,
	getResponsesLink,
	getPreviewLink,
	additionalActions,
}: SurveysListClientProps) {
	const t = useTranslations('survey');
	const locale = useLocale();

	const handleCopyLink = async (survey: Survey) => {
		const link = getPublicSurveyLink(survey.slug, survey.itemId || undefined);
		const success = await copyToClipboard(link);
		if (success) {
			toast.success(t('SURVEY_LINK_COPIED'));
		} else {
			toast.error(t('FAILED_TO_COPY_LINK'));
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col gap-1.5">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
				))}
			</div>
		);
	}

	if (surveys.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
				<div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/[0.06] mb-4">
					<ClipboardList className="w-6 h-6 text-gray-400 dark:text-gray-500" />
				</div>
				<p className="text-sm font-medium text-gray-900 dark:text-white">{emptyMessage}</p>
				{emptySubMessage && (
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{emptySubMessage}</p>
				)}
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-200 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02]">
							<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('NAME')}
							</th>
							{showTypeColumn && (
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('TYPE')}
								</th>
							)}
							<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('STATUS')}
							</th>
							{showResponsesColumn && (
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('RESPONSES')}
								</th>
							)}
							{showUpdatedColumn && (
								<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('UPDATED')}
								</th>
							)}
							<th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('ACTIONS')}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
						{surveys.map((survey) => (
							<tr
								key={survey.id}
								className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
							>
								<td className="px-5 py-3.5">
									<div className="text-sm font-medium text-gray-900 dark:text-white">
										{survey.title}
									</div>
									{survey.itemId && showTypeColumn && (
										<div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
											ID: {survey.itemId}
										</div>
									)}
								</td>
								{showTypeColumn && (
									<td className="px-5 py-3.5">
										<span className={cn(
											'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
											getTypeColor(survey.type)
										)}>
											{formatSurveyTypeLabel(survey.type)}
										</span>
									</td>
								)}
								<td className="px-5 py-3.5">
									<span className={cn(
										'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
										getStatusColor(survey.status)
									)}>
										{formatSurveyStatusLabel(survey.status)}
									</span>
								</td>
								{showResponsesColumn && (
									<td className="px-5 py-3.5 text-sm text-gray-900 dark:text-white tabular-nums">
										{(survey as Survey & { responseCount: number }).responseCount || 0}
									</td>
								)}
								{showUpdatedColumn && (
									<td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
										{survey.updatedAt ? formatDateTime(survey.updatedAt, locale) : '—'}
									</td>
								)}
								<td className="px-5 py-3.5">
									<div className="flex items-center gap-0.5">
										{additionalActions?.(survey)}
										{getResponsesLink && (
											<Link
												href={getResponsesLink(survey)}
												className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
												title={t('VIEW_RESPONSES')}
											>
												<FileText className="w-4 h-4" />
											</Link>
										)}
										{getPreviewLink && (
											<Link
												href={getPreviewLink(survey)}
												className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
												title={t('PREVIEW')}
											>
												<Eye className="w-4 h-4" />
											</Link>
										)}
										<button
											type="button"
											onClick={() => handleCopyLink(survey)}
											className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
											title={t('COPY_PUBLIC_LINK')}
										>
											<Copy className="w-4 h-4" />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
