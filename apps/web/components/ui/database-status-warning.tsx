'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { useLayoutTheme } from '@/components/context';

interface DatabaseStatusWarningProps {
	className?: string;
}

export function DatabaseStatusWarning({ className }: DatabaseStatusWarningProps) {
	const t = useTranslations('settings');
	const { features } = useFeatureFlags();
	const { databaseSimulationMode } = useLayoutTheme();

	// Check if database is actually configured (not simulation)
	const isDatabaseConfigured = features.ratings || features.comments || features.favorites;

	// Only show if:
	// 1. Database is NOT configured
	// 2. AND simulation mode is "enabled" (features are shown in UI)
	// Don't show when simulation is "disabled" because features are already hidden
	if (isDatabaseConfigured || databaseSimulationMode === 'disabled') {
		return null;
	}

	return (
		<div
			className={cn(
				'flex items-start gap-3',
				'px-4 py-3',
				'rounded-lg',
				'bg-white/80 dark:bg-white/[0.04]',
				'border border-gray-200/50 dark:border-white/[0.07]',
				'backdrop-blur-sm',
				'shadow-sm',
				'animate-fade-in-up',
				className
			)}
			role="status"
			aria-live="polite"
		>
			<Info className="h-5 w-5 text-gray-400 dark:text-gray-500" />
			<div>
				<h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
					{t('DATABASE_PREVIEW_MODE')}
				</h4>
				<p className="text-xs text-blue-700 dark:text-blue-300">
					{t('DATABASE_PREVIEW_MODE_DESC')}
				</p>
			</div>
		</div>
	);
}
