import { FiBriefcase, FiHeart, FiMessageCircle, FiSend, FiUserCheck, FiUserPlus } from 'react-icons/fi';
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
	/** When provided, the followers/following tiles become links to the list pages. */
	username?: string;
	/**
	 * `compact` (default): six small tiles in a 3-up / 6-up grid.
	 * `headline`: three large primary tiles (followers, following, submissions) — used at the top of the dashboard right column.
	 */
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

const COMPACT_ITEMS: StatItem[] = [
	{ key: 'followers', label: 'Followers', icon: <FiUserPlus className="w-3.5 h-3.5" /> },
	{ key: 'following', label: 'Following', icon: <FiUserCheck className="w-3.5 h-3.5" /> },
	{ key: 'submissions', label: 'Submissions', icon: <FiSend className="w-3.5 h-3.5" /> },
	{ key: 'comments', label: 'Comments', icon: <FiMessageCircle className="w-3.5 h-3.5" /> },
	{ key: 'favorites', label: 'Favorites', icon: <FiHeart className="w-3.5 h-3.5" /> },
	{ key: 'portfolio', label: 'Portfolio', icon: <FiBriefcase className="w-3.5 h-3.5" /> }
];

const HEADLINE_ITEMS: StatItem[] = [
	{ key: 'followers', label: 'Followers', icon: <FiUserPlus className="w-4 h-4" /> },
	{ key: 'following', label: 'Following', icon: <FiUserCheck className="w-4 h-4" /> },
	{ key: 'submissions', label: 'Submissions', icon: <FiSend className="w-4 h-4" /> }
];

export function ProfileStatsStrip({ stats, username, variant = 'compact' }: ProfileStatsStripProps) {
	const items = variant === 'headline' ? HEADLINE_ITEMS : COMPACT_ITEMS;
	const gridClass =
		variant === 'headline'
			? 'grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4'
			: 'grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3';

	return (
		<div className={gridClass}>
			{items.map((item) => {
				const linkHref =
					username && item.key === 'followers'
						? `/client/profile/${username}/followers`
						: username && item.key === 'following'
							? `/client/profile/${username}/following`
							: null;

				if (variant === 'headline') {
					const inner = (
						<>
							<div className="flex items-start justify-between mb-3">
								<p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
									{item.label}
								</p>
								<span className="p-1.5 bg-neutral-100 dark:bg-white/8 rounded-lg text-neutral-500 dark:text-neutral-400" aria-hidden="true">
									{item.icon}
								</span>
							</div>
							<p className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
								{formatCount(stats[item.key])}
							</p>
						</>
					);
					const base =
						'bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8 transition-all duration-150';
					if (linkHref) {
						return (
							<Link
								key={item.key}
								href={linkHref}
								className={`${base} hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40 hover:shadow-sm`}
							>
								{inner}
							</Link>
						);
					}
					return (
						<div key={item.key} className={base}>
							{inner}
						</div>
					);
				}

				/* compact variant */
				const tile = (
					<>
						<div className="flex items-center gap-1.5 mb-1.5">
							<span className="text-neutral-400 dark:text-neutral-500" aria-hidden="true">
								{item.icon}
							</span>
							<p className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-medium leading-none">
								{item.label}
							</p>
						</div>
						<p className="text-base font-semibold text-neutral-900 dark:text-white leading-none">
							{formatCount(stats[item.key])}
						</p>
					</>
				);
				const baseClass =
					'flex flex-col items-center justify-center rounded-xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 px-2 py-3 transition-all duration-150';
				if (linkHref) {
					return (
						<Link
							key={item.key}
							href={linkHref}
							className={`${baseClass} hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40 hover:shadow-sm cursor-pointer`}
						>
							{tile}
						</Link>
					);
				}
				return (
					<div key={item.key} className={baseClass}>
						{tile}
					</div>
				);
			})}
		</div>
	);
}
