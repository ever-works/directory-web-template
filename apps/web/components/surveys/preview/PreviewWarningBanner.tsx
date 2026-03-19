'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Preview Warning Banner
 * 
 * Displays a warning banner indicating that the survey is in preview mode
 * and responses will not be saved.
 */
export function PreviewWarningBanner() {
	const t = useTranslations('survey');

	return (
		<div
			role="alert"
			aria-live="polite"
			className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
		>
			<div className="flex items-start gap-3">
				<AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
				<div>
					<h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">{t('PREVIEW_MODE')}</h3>
					<p className="text-sm text-yellow-700 dark:text-yellow-300">
						{t('PREVIEW_MODE_DESC')}
					</p>
				</div>
			</div>
		</div>
	);
}

