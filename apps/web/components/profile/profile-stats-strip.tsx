'use client';

import { FiBriefcase, FiHeart, FiSend } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export interface ProfileStatsData {
	comments: number;
	favorites: number;
	portfolio: number;
	followers: number;
	following: number;
	submissions: number;
}

interface ProfileStatsStripProps {
	stats: ProfileStatsData;
	username?: string;
	variant?: 'compact' | 'headline';
}

const formatCount = (n: number): string => {
	if (n < 1000) return n.toString();
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
};

interface StatItem {
	key: keyof ProfileStatsData;
	label: string;
	icon: React.ReactNode;
}

export function ProfileStatsStrip({ stats, username, variant = 'compact' }: ProfileStatsStripProps) {
	const t = useTranslations('profile');

	const COMPACT_ITEMS: StatItem[] = [
		// { key: 'comments',    label: t('STAT_COMMENTS'),    icon: <FiMessageCircle className="w-3.5 h-3.5" /> },
		
		
	];

	const HEADLINE_ITEMS: StatItem[] = [
		{ key: 'submissions', label: t('STAT_SUBMISSIONS'), icon: <FiSend className="w-4 h-4" /> },
		{ key: 'portfolio',   label: t('STAT_PORTFOLIO'),   icon: <FiBriefcase className="w-3.5 h-3.5" /> },
		{ key: 'favorites',   label: t('STAT_FAVORITES'),   icon: <FiHeart className="w-3.5 h-3.5" /> },
	];

	const items = variant === 'headline' ? HEADLINE_ITEMS : COMPACT_ITEMS;

	if (variant === 'headline') {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{items.map((item) => {
					const linkHref =
						username && item.key === 'followers' ? `/client/profile/${username}/followers` :
						username && item.key === 'following' ? `/client/profile/${username}/following` : null;

					const inner = (
						<>
							<div className="flex items-center justify-between mb-4">
								<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
									{item.label}
								</p>
								<span className="p-1.5 rounded-lg bg-theme-primary-50 dark:bg-theme-primary-500/12 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true">
									{item.icon}
								</span>
							</div>
							<p className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight leading-none">
								{formatCount(stats[item.key])}
							</p>
							{linkHref && (
								<p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 group-hover:text-theme-primary-500 dark:group-hover:text-theme-primary-400 transition-colors duration-150">
									{t('STAT_VIEW_ALL')} →
								</p>
							)}
						</>
					);

					const base = 'group bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8 shadow-sm transition-all duration-150';

					return linkHref ? (
						<Link
							key={item.key}
							href={linkHref}
							className={`${base} hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40 hover:shadow-md`}
						>
							{inner}
						</Link>
					) : (
						<div key={item.key} className={base}>
							{inner}
						</div>
					);
				})}
			</div>
		);
	}

	/* compact variant */
	return (
		<div className="grid grid-cols-3 md:grid-cols-6 gap-2">
			{items.map((item) => {
				const linkHref =
					username && item.key === 'followers'  ? `/client/profile/${username}/followers` :
					username && item.key === 'following'  ? `/client/profile/${username}/following` :
					username && item.key === 'comments'   ? `/client/profile/${username}#activity-heading` :
					username && item.key === 'favorites'  ? `/client/profile/${username}#activity-heading` :
					username && item.key === 'portfolio'  ? `/client/profile/${username}#portfolio-heading` : null;

				const tile = (
					<>
						<div className="flex items-center gap-1.5 mb-1.5">
							<span className="text-neutral-400 dark:text-neutral-500" aria-hidden="true">
								{item.icon}
							</span>
							<p className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium leading-none truncate">
								{item.label}
							</p>
						</div>
						<p className="text-base font-bold text-neutral-900 dark:text-white leading-none tabular-nums">
							{formatCount(stats[item.key])}
						</p>
					</>
				);

				const baseClass = 'flex flex-col items-center justify-center rounded-xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 px-2 py-3 transition-all duration-150';

				return linkHref ? (
					<Link
						key={item.key}
						href={linkHref}
						className={`${baseClass} hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40 hover:shadow-sm cursor-pointer`}
					>
						{tile}
					</Link>
				) : (
					<div key={item.key} className={baseClass}>
						{tile}
					</div>
				);
			})}
		</div>
	);
}
