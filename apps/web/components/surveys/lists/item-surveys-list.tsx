'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { SurveysListClient } from './surveys-list-client';
import { SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';

const logger = Logger.create('ItemSurveysList');

interface DashboardItemSurveysClientProps {
	itemId: string;
	surveysEnabled: boolean;
}

export function DashboardItemSurveysClient({ itemId, surveysEnabled }: DashboardItemSurveysClientProps) {
	const t = useTranslations('survey');
	const [surveys, setSurveys] = useState<Survey[]>([]);
	const [loading, setLoading] = useState(true);

	const loadSurveys = async () => {
		setLoading(true);
		try {
			const data = await surveyApiClient.getMany({ type: SurveyTypeEnum.ITEM, itemId });
			setSurveys(data.surveys);
		} catch (error) {
			logger.error('Error loading surveys', error);
			toast.error(t('FAILED_TO_LOAD_SURVEYS'));
		} finally {
			setLoading(false);
		}
	};


	useEffect(() => {
		loadSurveys();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [itemId]);

	
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<Link
					href={`/dashboard/items/${itemId}`}
					className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					 {t('BACK_TO_ITEM_DASHBOARD')}
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

			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">{t('ITEM_SURVEYS')}</h1>
				<p className="text-gray-600 dark:text-gray-400">{t('SURVEYS_FOR_LISTING')}</p>
			</div>

			<SurveysListClient
				surveys={surveys}
				loading={loading}
				emptyMessage={t('NO_SURVEYS_FOUND_FOR_ITEM')}
				emptySubMessage={t('CONTACT_ADMIN_CREATE_SURVEYS')}
				getResponsesLink={(survey) => `/dashboard/items/${itemId}/surveys/${survey.slug}/responses`}
				getPreviewLink={(survey) => `/dashboard/items/${itemId}/surveys/${survey.slug}/preview`}
			/>
		</div>
	);
}
