'use client';

import React, { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { AdminSurveyForm, SurveyFormData } from '../forms/admin-survey-form';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Settings } from 'lucide-react';
import { SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';

const logger = Logger.create('CreateEditSurveyClient');

interface CreateEditSurveyClientProps {
	survey?: Survey;
	defaultItemId?: string;
}

export function CreateEditSurveyClient({ survey, defaultItemId }: CreateEditSurveyClientProps) {
	const router = useRouter();
	const t = useTranslations('survey');
	const { surveysEnabled } = useSurveysEnabled();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const mode = survey?.id ? 'edit' : 'create';

	const handleSubmit = async (data: SurveyFormData) => {
		setIsSubmitting(true);
		try {
			if (survey?.id) {
				await surveyApiClient.update(survey.id, data);
			} else {
				await surveyApiClient.create(data);
			}
			toast.success(mode === 'edit' ? t('SURVEY_UPDATED_SUCCESSFULLY') : t('SURVEY_CREATED_SUCCESSFULLY'));
			router.push('/admin/surveys');
		} catch (error) {
			logger.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} survey`, error);
			toast.error(error instanceof Error ? error.message : (mode === 'edit' ? t('FAILED_TO_UPDATE_SURVEY') : t('FAILED_TO_CREATE_SURVEY')));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		router.push('/admin/surveys');
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
				<button
					type="button"
					onClick={handleCancel}
					className="inline-flex items-center gap-1.5 mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					{t('BACK_TO_SURVEYS')}
				</button>
				<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
					{mode === 'edit' ? t('EDIT_SURVEY') : t('CREATE_SURVEY')}
				</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
					{mode === 'edit' ? t('SURVEY_UPDATED_SUCCESSFULLY') : t('CREATE_ITEM_SURVEY_DESC')}
				</p>
				<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
			</div>

			{/* Form Card */}
			<div className="bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden">
				<AdminSurveyForm
					mode={mode}
					survey={survey}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={isSubmitting}
					defaultType={defaultItemId ? SurveyTypeEnum.ITEM : undefined}
					defaultItemId={defaultItemId}
				/>
			</div>
		</div>
	);
}
