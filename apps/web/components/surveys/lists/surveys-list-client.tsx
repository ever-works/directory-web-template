'use client';

import React from 'react';
import Link from 'next/link';
import type { Survey } from '@/lib/db/schema';
import { getStatusColor, getTypeColor, getPublicSurveyLink, copyToClipboard, formatSurveyTypeLabel, formatSurveyStatusLabel } from '../utils/survey-helpers';
import { toast } from 'sonner';
import { Copy, Eye, FileText } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { formatDateTime } from '@/utils/date';

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
			<div className="text-center py-16">
				<p className="text-gray-500 dark:text-gray-400">{t('LOADING_SURVEYS')}</p>
			</div>
		);
	}

	if (surveys.length === 0) {
		return (
			<div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
				<p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
				{emptySubMessage && (
					<p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{emptySubMessage}</p>
				)}
			</div>
		);
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="bg-gray-50 dark:bg-gray-900">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('NAME')}
							</th>
							{showTypeColumn && (
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('TYPE')}
								</th>
							)}
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('STATUS')}
							</th>
							{showResponsesColumn && (
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('RESPONSES')}
								</th>
							)}
							{showUpdatedColumn && (
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{t('UPDATED')}
								</th>
							)}
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
								{t('ACTIONS')}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
						{surveys.map((survey) => (
							<tr key={survey.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
								<td className="px-6 py-4">
									<div className="font-medium">{survey.title}</div>
									{survey.itemId && showTypeColumn && (
										<div className="text-sm text-gray-500 dark:text-gray-400">Item ID: {survey.itemId}</div>
									)}
								</td>
								{showTypeColumn && (
									<td className="px-6 py-4">
										<span className={`px-2 py-1 rounded-sm text-xs font-medium ${getTypeColor(survey.type)}`}>
											{formatSurveyTypeLabel(survey.type)}
										</span>
									</td>
								)}
								<td className="px-6 py-4">
									<span className={`px-2 py-1 rounded-sm text-xs font-medium ${getStatusColor(survey.status)}`}>
										{formatSurveyStatusLabel(survey.status)}
									</span>
								</td>
								{showResponsesColumn && (
									<td className="px-6 py-4 text-sm">
										{(survey as Survey & { responseCount: number }).responseCount || 0}
									</td>
								)}
								{showUpdatedColumn && (
									<td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
										{survey.updatedAt ? formatDateTime(survey.updatedAt, locale) : '-'}
									</td>
								)}
								<td className="px-6 py-4">
									<div className="flex items-center gap-2">
										{additionalActions?.(survey)}
										{getResponsesLink && (
											<Link
												href={getResponsesLink(survey)}
											className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-sm transition-colors"
											title={t('VIEW_RESPONSES')}
										>
											<FileText className="w-4 h-4" />
										</Link>
									)}
									{getPreviewLink && (
										<Link
											href={getPreviewLink(survey)}
											className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-sm transition-colors"
											title={t('PREVIEW')}
										>
											<Eye className="w-4 h-4" />
										</Link>
									)}
									<button
										type="button"
										onClick={() => handleCopyLink(survey)}
										className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm transition-colors"
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

