'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { SurveyFormNoSSR } from './survey-form-no-ssr';
import { useTranslations } from 'next-intl';
import { PreviewWarningBanner } from '../preview/PreviewWarningBanner';

interface SurveyPreviewDialogProps {
	surveyJson: object;
	title?: string;
	isOpen: boolean;
	onClose: () => void;
}

export function SurveyPreviewDialog({
	surveyJson,
	title,
	isOpen,
	onClose
}: SurveyPreviewDialogProps) {
	const t = useTranslations('survey');

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="4xl"
			className="max-h-[90vh] flex flex-col"
			title={title || t('SURVEY_PREVIEW')}
			subtitle={<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('PREVIEW_MODE_USER_DESC')}</p>}
		>

			<PreviewWarningBanner />

		<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
			<SurveyFormNoSSR
				surveyJson={surveyJson}
				mode="display"
				className="survey-preview"
			/>
		</div>

		</Modal>
	);
}

