import { useId } from 'react';
import { LucideIcon } from 'lucide-react';

// Design system constants for accessibility
const CARD_BASE_STYLES =
	'bg-white dark:bg-gray-900 rounded-xl shadow-xs p-6 border border-gray-200 dark:border-gray-700';
const ICON_CONTAINER_STYLES = 'p-2 bg-theme-primary-100 dark:bg-theme-primary-900/30 rounded-lg';
const ICON_STYLES = 'h-5 w-5 text-theme-primary-600 dark:text-theme-primary-400';
const TITLE_STYLES = 'text-sm font-medium text-gray-600 dark:text-gray-400';
const VALUE_STYLES = 'text-2xl font-bold text-gray-900 dark:text-gray-100';
const DESCRIPTION_STYLES = 'mt-2 text-sm text-gray-500 dark:text-gray-400';

interface StatsCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon: LucideIcon;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
	isLoading?: boolean;
}

export function StatsCard({
	title,
	value,
	description,
	icon: Icon,
	trend,
	className = '',
	isLoading = false
}: StatsCardProps) {
	const uid = useId();
	const base = `${title.toLowerCase().replace(/\s+/g, '-')}-${uid}`;
	const titleId = `${base}-title`;
	const descId = `${base}-description`;
	if (isLoading) {
		return (
			<div className={`${CARD_BASE_STYLES} ${className}`} aria-busy="true" aria-live="polite">
				<span className="sr-only">{`Loading ${title} statistic`}</span>
				<div className="animate-pulse">
					<div className="flex items-center space-x-2">
						<div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
							<div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
						</div>
						<div className="flex-1">
							<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-2"></div>
							<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
	const trendDescription = trend
		? `${trend.isPositive ? 'increased' : 'decreased'} by ${Math.abs(trend.value)}% from last month`
		: '';

	return (
		<article
			className={`${CARD_BASE_STYLES} ${className}`}
			aria-labelledby={titleId}
			{...(description ? { 'aria-describedby': descId } : {})}
		>
			<div className="flex items-center">
				<div className="flex-1">
					<div className="flex items-center space-x-2">
						<div className={ICON_CONTAINER_STYLES} aria-hidden="true">
							<Icon className={ICON_STYLES} />
						</div>
						<div>
							<h3 id={titleId} className={TITLE_STYLES}>
								{title}
							</h3>
							<p className={VALUE_STYLES}>{formattedValue}</p>
						</div>
					</div>
					{description && (
						<p id={descId} className={DESCRIPTION_STYLES}>
							{description}
						</p>
					)}
					{trend && (
						<div className="mt-2 flex items-center space-x-1">
							<span className="sr-only">{trendDescription}</span>
							<span
								className={`text-sm font-medium ${
									trend.isPositive
										? 'text-green-600 dark:text-green-400'
										: 'text-red-600 dark:text-red-400'
								}`}
								aria-hidden="true"
							>
								{trend.isPositive ? '+' : '-'}
								{Math.abs(trend.value)}%
							</span>
							<span className="text-sm text-gray-500 dark:text-gray-400" aria-hidden="true">
								from last month
							</span>
						</div>
					)}
				</div>
			</div>
		</article>
	);
}
