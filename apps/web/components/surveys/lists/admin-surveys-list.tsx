'use client';

import React, { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, AlertTriangle, Settings, ClipboardList } from 'lucide-react';
import { SurveysListClient } from './surveys-list-client';
import { useConfirm } from '@/components/providers';
import { SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import { cn } from '@/lib/utils';

const logger = Logger.create('AdminSurveysList');

type FilterType = 'all' | 'global' | 'item';

const FILTER_TABS: { key: FilterType; labelKey: string }[] = [
	{ key: 'all', labelKey: 'ALL_SURVEYS' },
	{ key: 'global', labelKey: 'GLOBAL' },
	{ key: 'item', labelKey: 'ITEMS' },
];

export function AdminSurveysClient() {
	const router = useRouter();
	const { confirm } = useConfirm();
	const t = useTranslations('survey');
	const tCommon = useTranslations('common');
	const { surveysEnabled } = useSurveysEnabled();
	const [surveys, setSurveys] = useState<(Survey & { responseCount: number })[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<FilterType>('all');

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

		if (!confirmed) return;

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
		<div className="space-y-6">
			{/* Warning Banner — Surveys Disabled */}
			{!surveysEnabled && (
				<div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 shrink-0 mt-0.5">
						<AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
							{t('SURVEYS_DISABLED_WARNING')}
						</h3>
						<p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
							{t('SURVEYS_DISABLED_MESSAGE')}
						</p>
						<Link
							href="/admin/settings"
							className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 text-xs font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700/30 transition-colors"
						>
							<Settings className="w-3 h-3" />
							{t('GO_TO_SETTINGS')}
						</Link>
					</div>
				</div>
			)}

			{/* Page Header */}
			<div>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-gray-800 flex items-center justify-center shrink-0 shadow-sm">
							<ClipboardList className="w-5 h-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
								{t('SURVEYS_MANAGEMENT')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
								{t('SURVEYS_MANAGEMENT_DESC')}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleCreateSurvey}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
					>
						<Plus className="w-4 h-4" />
						{t('CREATE_SURVEY')}
					</button>
				</div>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Filter Tabs */}
			<div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/[0.04] rounded-lg p-0.5 w-fit">
				{FILTER_TABS.map(({ key, labelKey }) => (
					<button
						key={key}
						type="button"
						onClick={() => setFilter(key)}
						className={cn(
							'px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer',
							filter === key
								? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
						)}
					>
						{key === 'all' ? t(labelKey) : tCommon(labelKey)}
					</button>
				))}
			</div>

			{/* Surveys List */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
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
								className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
								title={t('EDIT_SURVEY')}
							>
								<Edit className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => handleDeleteSurvey(survey.id, survey.title)}
								className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
								title={t('DELETE_SURVEY')}
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</>
					)}
				/>
			</div>
		</div>
	);
}
