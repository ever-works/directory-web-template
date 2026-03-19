'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurveysListClient } from './surveys-list-client';
import { useConfirm } from '@/components/providers';
import { SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import Link from 'next/link';

const logger = Logger.create('AdminSurveysList');

export function AdminSurveysClient() {
	const router = useRouter();
	const { confirm } = useConfirm();
	const t = useTranslations('survey');
	const tCommon = useTranslations('common');
	const { surveysEnabled } = useSurveysEnabled();
	const [surveys, setSurveys] = useState<(Survey & { responseCount: number })[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<'all' | 'global' | 'item'>('all');

	useEffect(() => {
		loadSurveys();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filter]);

	const loadSurveys = async () => {
		setLoading(true);
		try {
			const type = filter === 'all' 
				? undefined 
				: filter === 'global' 
					? SurveyTypeEnum.GLOBAL 
					: SurveyTypeEnum.ITEM;
			const data = await surveyApiClient.getMany({ type });
			setSurveys(data.surveys);
		} catch (error) {
			logger.error('Error loading surveys', error);
			toast.error(t('FAILED_TO_LOAD_SURVEYS'));
		} finally {
			setLoading(false);
		}
	};

	const handleCreateSurvey = () => {
		router.push('/admin/surveys/create');
	};

	const handleEditSurvey = (slug: string) => {
		router.push(`/admin/surveys/${slug}/edit`);
	};

	const handleDeleteSurvey = async (id: string, title: string) => {
		const confirmed = await confirm({
			title: t('DELETE_SURVEY_CONFIRM_TITLE'),
			message: t('DELETE_SURVEY_CONFIRM_MSG', { title }),
			confirmText: tCommon('DELETE'),
			cancelText: tCommon('CANCEL'),
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		try {
			await surveyApiClient.delete(id);
			toast.success(t('SURVEY_DELETED_SUCCESSFULLY'));
			loadSurveys();
		} catch (error) {
			logger.error('Error deleting survey', error);
			toast.error(t('FAILED_TO_DELETE_SURVEY'));
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			{/* Warning Banner - Surveys Disabled */}
			{!surveysEnabled && (
				<div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg shadow-md">
					<div className="flex items-start">
						<div className="shrink-0">
							<svg
								className="h-6 w-6 text-yellow-400 dark:text-yellow-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div className="ml-3 flex-1">
							<h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
								{t('SURVEYS_DISABLED_WARNING')}
							</h3>
							<div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
								<p>{t('SURVEYS_DISABLED_MESSAGE')}</p>
							</div>
							<div className="mt-4">
								<Link
									href="/admin/settings"
									className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
								>
									{t('GO_TO_SETTINGS')}
									<svg
										className="ml-2 -mr-0.5 h-4 w-4"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold mb-2">{t('SURVEYS_MANAGEMENT')}</h1>
					<p className="text-gray-600 dark:text-gray-400">{t('SURVEYS_MANAGEMENT_DESC')}</p>
				</div>
				<Button
					type="button" 
					onClick={handleCreateSurvey}
					variant="default"
					className="flex items-center gap-2"
				>
					<Plus className="w-5 h-5 mr-1" />
					{t('CREATE_SURVEY')}
				</Button>
			</div>

			{/* Filters */}
			<div className="mb-6 flex gap-2">
				<Button
					type="button" 
					onClick={() => setFilter('all')}
					variant={filter === 'all' ? 'default' : 'outline-solid'}
				>
					{t('ALL_SURVEYS')}
				</Button>
				<Button
					type="button" 
					onClick={() => setFilter('global')}
					variant={filter === 'global' ? 'default' : 'outline-solid'}
				>
					{tCommon('GLOBAL')}
				</Button>
				<Button
					type="button" 
					onClick={() => setFilter('item')}
					variant={filter === 'item' ? 'default' : 'outline-solid'}
				>
					{tCommon('ITEMS')}
				</Button>
			</div>

			<SurveysListClient
				surveys={surveys}
				loading={loading}
				showTypeColumn={true}
				showResponsesColumn={true}
				showUpdatedColumn={true}
				getResponsesLink={(survey) => `/admin/surveys/${survey.slug}/responses`}
				getPreviewLink={(survey) => `/admin/surveys/${survey.slug}/preview`}
				additionalActions={(survey) => (
					<>
						<button
							type="button" 
							onClick={() => handleEditSurvey(survey.slug)}
							className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-sm transition-colors"
							title={t('EDIT_SURVEY')}
						>
							<Edit className="w-4 h-4" />
						</button>
						<button
							type="button" 
							onClick={() => handleDeleteSurvey(survey.id, survey.title)}
							className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors"
							title={t('DELETE_SURVEY')}
						>
							<Trash2 className="w-4 h-4" />
						</button>
					</>
				)}
			/>
		</div>
	);
}
