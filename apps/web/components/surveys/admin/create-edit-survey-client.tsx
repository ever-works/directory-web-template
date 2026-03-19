'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSurveyForm, SurveyFormData } from '../forms/admin-survey-form';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurveyTypeEnum } from '@/lib/types/survey';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { useSurveysEnabled } from '@/hooks/use-surveys-enabled';
import Link from 'next/link';

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
		<div className="container mx-auto px-4 py-8 max-w-4xl">
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

			<div className="mb-6">
				<Button
					onClick={handleCancel}
					variant="ghost"
					className="mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					{t('BACK_TO_SURVEYS')}
				</Button>
				<h1 className="text-3xl font-bold mb-2">{mode === 'edit' ? t('EDIT_SURVEY') : t('CREATE_SURVEY')}</h1>
				<p className="text-gray-600 dark:text-gray-400">
					{mode === 'edit' ? t('SURVEY_UPDATED_SUCCESSFULLY') : t('CREATE_ITEM_SURVEY_DESC')}
				</p>
			</div>

		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs">
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

