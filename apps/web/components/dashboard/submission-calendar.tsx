'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { SubmissionCalendarDataExport } from '@/hooks/use-dashboard-stats';
import { CARD_BASE_STYLES, TITLE_STYLES, SUBTITLE_STYLES, VALUE_STYLES } from './styles';

interface SubmissionCalendarProps {
	data: SubmissionCalendarDataExport[];
	isLoading?: boolean;
}

interface DayData {
	date: string;
	count: number;
	dayOfWeek: number;
}

function getIntensityClass(count: number, maxCount: number): string {
	if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
	const ratio = count / Math.max(maxCount, 1);
	if (ratio <= 0.25) return 'bg-green-200 dark:bg-green-900';
	if (ratio <= 0.5) return 'bg-green-400 dark:bg-green-700';
	if (ratio <= 0.75) return 'bg-green-500 dark:bg-green-600';
	return 'bg-green-600 dark:bg-green-500';
}

/**
 * Formats a date as YYYY-MM-DD using local date components
 * Avoids timezone issues that occur with toISOString()
 */
function formatDateToLocalString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDate(dateStr: string, locale: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString(locale, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function SubmissionCalendar({ data, isLoading = false }: SubmissionCalendarProps) {
	const t = useTranslations('client.dashboard.SUBMISSION_CALENDAR');
	const locale = useLocale();

	const calendarData = useMemo(() => {
		const dataMap = new Map(data.map((d) => [d.date, d.count]));
		const today = new Date();
		const days: DayData[] = [];

		for (let i = 89; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(date.getDate() - i);
			const dateStr = formatDateToLocalString(date);
			days.push({
				date: dateStr,
				count: dataMap.get(dateStr) || 0,
				dayOfWeek: date.getDay()
			});
		}

		return days;
	}, [data]);

	const maxCount = useMemo(() => {
		return Math.max(...calendarData.map((d) => d.count), 1);
	}, [calendarData]);

	const weeks = useMemo(() => {
		const result: DayData[][] = [];
		let currentWeek: DayData[] = [];

		calendarData.forEach((day, index) => {
			if (index === 0 && day.dayOfWeek !== 0) {
				for (let i = 0; i < day.dayOfWeek; i++) {
					currentWeek.push({ date: '', count: -1, dayOfWeek: i });
				}
			}

			currentWeek.push(day);

			if (day.dayOfWeek === 6 || index === calendarData.length - 1) {
				result.push(currentWeek);
				currentWeek = [];
			}
		});

		return result;
	}, [calendarData]);

	const totalSubmissions = useMemo(() => {
		return calendarData.reduce((sum, d) => sum + d.count, 0);
	}, [calendarData]);

	if (isLoading) {
		return (
			<div className={CARD_BASE_STYLES}>
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-4 w-1/3"></div>
					<div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
				</div>
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className={CARD_BASE_STYLES}>
				<h3 className={TITLE_STYLES}>{t('TITLE')}</h3>
				<p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('NO_DATA')}</p>
				<p className={`${SUBTITLE_STYLES} text-center`}>{t('NO_DATA_DESC')}</p>
			</div>
		);
	}

	return (
		<section className={CARD_BASE_STYLES} aria-labelledby="submission-calendar-title">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h3 id="submission-calendar-title" className={TITLE_STYLES}>
						{t('TITLE')}
					</h3>
					<p className={SUBTITLE_STYLES}>{t('SUBTITLE')}</p>
				</div>
				<div className="text-right">
					<div className={VALUE_STYLES}>{totalSubmissions}</div>
					<div className="text-xs text-gray-500 dark:text-gray-400">
						{totalSubmissions === 1 ? t('SUBMISSION') : t('SUBMISSIONS')}
					</div>
				</div>
			</div>
			<div className="overflow-x-auto w-full">
				<div className="flex gap-1 justify-center">
					{weeks.map((week, weekIndex) => (
						<div key={weekIndex} className="flex flex-col gap-0.5">
							{week.map((day, dayIndex) => (
								<div
									key={`${weekIndex}-${dayIndex}`}
									className={`w-3 h-3 rounded-xs ${
										day.count === -1 ? 'bg-transparent' : getIntensityClass(day.count, maxCount)
									}`}
									title={
										day.count >= 0
											? `${formatDate(day.date, locale)}: ${day.count} ${day.count === 1 ? t('SUBMISSION') : t('SUBMISSIONS')}`
											: undefined
									}
								/>
							))}
						</div>
					))}
				</div>
			</div>
			<div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
				<span>{t('LESS')}</span>
				<div className="flex gap-0.5">
					<div className="w-3 h-3 rounded-xs bg-gray-100 dark:bg-gray-800" />
					<div className="w-3 h-3 rounded-xs bg-green-200 dark:bg-green-900" />
					<div className="w-3 h-3 rounded-xs bg-green-400 dark:bg-green-700" />
					<div className="w-3 h-3 rounded-xs bg-green-500 dark:bg-green-600" />
					<div className="w-3 h-3 rounded-xs bg-green-600 dark:bg-green-500" />
				</div>
				<span>{t('MORE')}</span>
			</div>
		</section>
	);
}
