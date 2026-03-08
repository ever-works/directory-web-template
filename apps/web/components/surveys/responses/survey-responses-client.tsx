'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { ResponseFilters } from '@/lib/types/survey';
import type { Survey, SurveyResponse } from '@/lib/db/schema';
import { exportResponsesToCSV } from '../utils/survey-helpers';
import { toast } from 'sonner';
import { ArrowLeft, Download, Filter, AlertTriangle } from 'lucide-react';
import { ResponseDetailDialog } from './response-detail-dialog';
import { formatDateTime } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { useTranslations, useLocale } from 'next-intl';

const logger = Logger.create('SurveyResponsesClient');



interface SurveyResponsesClientProps {
	survey: Survey;
	backLink: {
		href: string;
		label: string;
	};
	subtitle?: string;
	initialFilters?: ResponseFilters;
	surveysEnabled?: boolean;
}

export function SurveyResponsesClient({
	survey,
	backLink,
	subtitle,
	initialFilters = {},
	surveysEnabled = true
}: SurveyResponsesClientProps) {
	const t = useTranslations('survey');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const [responses, setResponses] = useState<SurveyResponse[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState<ResponseFilters>(initialFilters);
	const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	useEffect(() => {
		loadResponses();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [survey.id, filters]);

	const loadResponses = async () => {
		setLoading(true);
		try {
			const data = await surveyApiClient.getResponses(survey.id, filters);
			if (data) {
				setResponses(data.responses || []);
			setTotal(data.total || 0);
		}
		} catch (error) {
			logger.error('Error loading responses', error);
			toast.error(t('FAILED_TO_LOAD_SURVEYS'));
		} finally {
			setLoading(false);
		}
	};

	const handleExport = () => {
		if (responses.length === 0) {
			toast.error(t('NO_RESPONSES_TO_EXPORT'));
			return;
		}
		exportResponsesToCSV(responses as any, survey.title);
		toast.success(t('CSV_FILE_DOWNLOADED'));
	};

	const handleViewDetails = (response: SurveyResponse) => {
		setSelectedResponse(response);
		setIsDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setIsDialogOpen(false);
		setSelectedResponse(null);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<Link
					href={backLink.href}
					className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					{backLink.label}
				</Link>
			</div>

			{/* Warning Banner - Surveys Disabled */}
			{!surveysEnabled && (
				<div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow-md">
					<div className="flex items-start">
						<div className="shrink-0">
							<AlertTriangle className="h-6 w-6 text-yellow-400 dark:text-yellow-500" aria-hidden="true" />
						</div>
						<div className="ml-3 flex-1">
							<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
								{t('WARNING_DISABLED_TITLE')}
							</h3>
							<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
								<p>{t('WARNING_DISABLED_MESSAGE')}</p>
							</div>
							<div className="mt-4">
								<Link
									href="/admin/settings"
									className="text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-600 dark:hover:text-yellow-200 underline"
								>
									{t('WARNING_DISABLED_ACTION')}
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="mb-8 flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold mb-2">{survey.title} -  {t('RESPONSES')}</h1>
					<p className="text-gray-600 dark:text-gray-400">
						{subtitle || t('TOTAL_RESPONSES', { count: total })}
					</p>
				</div>
				<Button
					onClick={handleExport}
					disabled={responses.length === 0}
				>
					<Download className="w-4 h-4 mr-1" />
					 {tCommon('EXPORT_CSV')}
				</Button>
			</div>

			{/* Filters */}
			<div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-xs p-4">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Filter className="w-4 h-4 text-gray-500" />
						<span className="text-sm font-medium"> {tCommon('FILTERS')}:</span>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm" htmlFor="startDate"> {tCommon('FROM')}:</label>
						<input
							id="startDate"
							type="date"
							value={filters.startDate || ''}
							onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
							className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-sm text-sm bg-white dark:bg-gray-900"
						/>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm" htmlFor="endDate"> {tCommon('TO')}:</label>
						<input
							id="endDate"
							type="date"
							value={filters.endDate || ''}
							onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
							className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-sm text-sm bg-white dark:bg-gray-900"
						/>
					</div>
					{(filters.startDate || filters.endDate) && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setFilters({ ...filters, startDate: undefined, endDate: undefined })}
						>
							 {tCommon('CLEAR_DATES')}
						</Button>
					)}
				</div>
			</div>

			{loading ? (
				<div className="text-center py-16">
					<p className="text-gray-500 dark:text-gray-400"> {tCommon('LOADING_RESPONSES')}</p>
				</div>
			) : responses.length === 0 ? (
				<div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg">
					<p className="text-gray-500 dark:text-gray-400"> {tCommon('NO_RESPONSES_FOUND')}</p>
				</div>
			) : (
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50 dark:bg-gray-900">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										 {t('RESPONSE_ID')}
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										 {tCommon('USER')}
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
										 {t('COMPLETED_AT')}
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									 {t('ACTIONS')}
								</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{responses.map((response) => (
									<tr key={response.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
										<td className="px-6 py-4 text-sm font-mono">{response.id}</td>
										<td className="px-6 py-4 text-sm">{response.userId || tCommon('ANONYMOUS')}</td>
										<td className="px-6 py-4 text-sm">{formatDateTime(response.completedAt, locale)}</td>
										<td className="px-6 py-4">
											<Button
												onClick={() => handleViewDetails(response)}
												size="sm"
												variant="ghost"
											>
												 {tCommon('VIEW_DETAILS')}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Response Detail Dialog */}
			{selectedResponse && (
				<ResponseDetailDialog
					survey={survey}
					response={selectedResponse}
					isOpen={isDialogOpen}
					onClose={handleCloseDialog}
				/>
			)}
		</div>
	);
}

