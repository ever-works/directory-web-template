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
				'p-4 rounded-xl',
				'bg-white dark:bg-[#111111]',
				'border border-gray-200 dark:border-white/6',
				'shadow-sm',
				'animate-fade-in-up',
				className
			)}
			role="status"
			aria-live="polite"
		>
			<div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-theme-primary-50 dark:bg-theme-primary-900/30">
				<Info className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
			</div>
			<div className="flex-1 min-w-0">
				<h4 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
					{t('DATABASE_PREVIEW_MODE')}
				</h4>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
					{t('DATABASE_PREVIEW_MODE_DESC')}
				</p>
			</div>
		</div>
	);
}
