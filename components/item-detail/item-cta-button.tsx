'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { surveyApiClient } from '@/lib/api/survey-api.client';
import { SurveyStatusEnum } from '@/lib/types/survey';
import type { SurveyItem } from '@/lib/db/schema';
import { SurveyDialog } from '@/components/surveys/survey-dialog';
import { Logger } from '@/lib/logger';
import { toast } from 'sonner';

const logger = Logger.create('ItemCTAButton');

interface ItemCTAButtonProps {
	action?: 'visit-website' | 'start-survey' | 'buy';
	sourceUrl?: string;
	itemSlug?: string;
}

export function ItemCTAButton({ action = 'visit-website', sourceUrl, itemSlug }: ItemCTAButtonProps) {
	const t = useTranslations('common');
	const tSurvey = useTranslations('survey');
	const [firstSurvey, setFirstSurvey] = useState<SurveyItem | null>(null);
	const [loading, setLoading] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);

	const loadFirstSurvey = useCallback(async () => {
		if (!itemSlug) return;

		setLoading(true);
		try {
			const result = await surveyApiClient.getMany({
				itemId: itemSlug,
				status: SurveyStatusEnum.PUBLISHED
			});
			if (result.surveys && result.surveys.length > 0) {
				setFirstSurvey(result.surveys[0]);
			}
		} catch (err) {
			logger.error('Error loading first survey', err);
			toast.error(tSurvey('FAILED_TO_LOAD_SURVEYS'));
		} finally {
			setLoading(false);
		}
	}, [itemSlug, tSurvey]);

	// Load first survey when action is 'start-survey'
	useEffect(() => {
		if (action === 'start-survey' && itemSlug) {
			loadFirstSurvey();
		}
	}, [action, itemSlug, loadFirstSurvey]);

	const handleStartSurvey = () => {
		if (firstSurvey) {
			setDialogOpen(true);
		} else {
			toast.error(tSurvey('NO_SURVEYS_FOUND_FOR_ITEM'));
		}
	};

	const handleSurveyCompleted = () => {
		setDialogOpen(false);
		toast.success(tSurvey('SURVEY_SUBMITTED_SUCCESSFULLY'));
	};

	// Render based on action type
	if (action === 'start-survey') {
		return (
			<>
				<button
					onClick={handleStartSurvey}
					disabled={loading || !firstSurvey}
					className="group relative cursor-pointer inline-flex items-center px-4 py-2 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 dark:from-theme-primary-700 dark:to-theme-primary-800 dark:hover:from-theme-primary-800 dark:hover:to-theme-primary-900 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
					<span className="mr-2 text-base">📋</span>
					<span className="relative">
						{loading ? t('LOADING') + '...' : tSurvey('TAKE_SURVEY')}
					</span>
				</button>
				{firstSurvey && (
					<SurveyDialog
						survey={firstSurvey}
						open={dialogOpen}
						onClose={() => setDialogOpen(false)}
						itemSlug={itemSlug || ''}
						onCompleted={handleSurveyCompleted}
					/>
				)}
			</>
		);
	}

	if (action === 'buy') {
		return (
			<button
				disabled
				className="group relative cursor-not-allowed inline-flex items-center px-4 py-2 bg-linear-to-r from-gray-400 to-gray-500 text-white rounded-md font-medium transition-all duration-200 shadow-md opacity-50"
			>
				<span className="mr-2 text-base">🛒</span>
				<span className="relative text-sm">Buy (Coming Soon)</span>
			</button>
		);
	}

	// Default: visit-website
	return (
		<a
			target="_blank"
			href={sourceUrl || '#'}
			className="group relative inline-flex cursor-pointer items-center px-4 py-2 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 dark:from-theme-primary-700 dark:to-theme-primary-800 dark:hover:from-theme-primary-800 dark:hover:to-theme-primary-900 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform overflow-hidden"
		>
			<span className="mr-2 text-base">🌐</span>
			<span className="relative text-sm">{t('VISIT_WEBSITE')}</span>
		</a>
	);
}

