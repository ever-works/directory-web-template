'use client';

import React, { useState } from 'react';
import { Model } from 'survey-core';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import type { Survey } from '@/lib/db/schema';
import { toast } from 'sonner';
import { SurveyFormNoSSR } from './survey-form-no-ssr';
import { Logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';

const logger = Logger.create('SurveyFormWrapper');

interface SurveyFormWrapperProps {
	survey: Survey;
	itemSlug?: string;
	onCompleted?: () => void;
	className?: string;
}

/**
 * Common Survey Form Component
 * Used in both dialog and full page contexts
 */
export function SurveyFormWrapper({ 
	survey, 
	itemSlug, 
	onCompleted,
	className 
}: SurveyFormWrapperProps) {
	const t = useTranslations('survey');
	const [hasStarted, setHasStarted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleValueChanged = () => {
		if (!hasStarted) {
			setHasStarted(true);
		}
	};

	const handleComplete = async (sender: Model) => {
		if (isSubmitting) return;
		
		try {
			setIsSubmitting(true);
			await surveyApiClient.submitResponse({
				surveyId: survey.id,
				itemId: itemSlug,
				data: sender.data,
			});

			toast.success(t('SURVEY_COMPLETED_SUCCESS'));
			
			// Call the completion callback if provided
			if (onCompleted) {
				onCompleted();
			}
		} catch (error) {
			logger.error('Error saving survey response', error);
			toast.error(t('FAILED_TO_SAVE_SURVEY_RESPONSE'));
		} finally {
			setIsSubmitting(false);
		} 
	};

	if (survey.status !== 'published') {
		return (
			<div className="text-center py-8">
				<h3 className="text-xl font-semibold mb-2">{t('SURVEY_NOT_AVAILABLE')}</h3>
				<p className="text-gray-600 dark:text-gray-400">
					{t('SURVEY_STATUS_NOT_AVAILABLE', { status: survey.status })}
				</p>
			</div>
		);
	}

	return (
		<div className={className}>
			<SurveyFormNoSSR
				surveyJson={survey.surveyJson as object}
				onComplete={handleComplete}
				onValueChanged={handleValueChanged}
				className="survey-form"
			/>
		</div>
	);
}

