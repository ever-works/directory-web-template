'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { SurveyFormNoSSR } from '../forms/survey-form-no-ssr';
import { Survey } from '@/lib/db/schema';
import { useTranslations } from 'next-intl';
import { PreviewWarningBanner } from './PreviewWarningBanner';


interface SurveyPreviewClientProps {
	survey: Survey;
	backLink: string;
	surveysEnabled: boolean;
}

export function SurveyPreviewClient({ survey, backLink, surveysEnabled }: SurveyPreviewClientProps) {
	const t = useTranslations('survey');
	
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			<div className="mb-6">
				<Link
					prefetch={false}
					href={backLink}
					className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					{t('BACK_TO_SURVEYS')}
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

			<div className="mb-6">
				<PreviewWarningBanner />
			</div>

			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
				{survey.description && <p className="text-gray-600 dark:text-gray-400">{survey.description}</p>}
			</div>

		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xs p-6">
			<SurveyFormNoSSR
				surveyJson={survey.surveyJson as object}
				mode="display"
				className="survey-preview"
			/>
		</div>
		</div>
	);
}

