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
	{ key: 'followers', label: 'Followers', icon: <FiUserPlus className="w-4 h-4" /> },
	{ key: 'following', label: 'Following', icon: <FiUserCheck className="w-4 h-4" /> },
	{ key: 'submissions', label: 'Submissions', icon: <FiSend className="w-4 h-4" /> },
	{ key: 'comments', label: 'Comments', icon: <FiMessageCircle className="w-4 h-4" /> },
	{ key: 'favorites', label: 'Favorites', icon: <FiHeart className="w-4 h-4" /> },
	{ key: 'portfolio', label: 'Portfolio', icon: <FiBriefcase className="w-4 h-4" /> }
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
			: 'grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4';

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
							<div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
								{item.icon}
								<span className="text-xs font-medium uppercase tracking-wide">{item.label}</span>
							</div>
							<div className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
								{formatCount(stats[item.key])}
							</div>
						</>
					);
					const base =
						'rounded-xl border border-gray-200 dark:border-white/6 bg-white dark:bg-[#141414] px-5 py-4 shadow-sm transition-colors';
					if (linkHref) {
						return (
							<Link
								key={item.key}
								href={linkHref}
								className={`${base} hover:border-theme-primary-300 dark:hover:border-theme-primary-500/40`}
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

				const tile = (
					<>
						<div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
							{item.icon}
							<span className="text-xs uppercase tracking-wide">{item.label}</span>
						</div>
						<div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
							{formatCount(stats[item.key])}
						</div>
					</>
				);
				const baseClass =
					'flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-white/6 bg-white/60 dark:bg-white/3 px-3 py-2 transition-colors';
				if (linkHref) {
					return (
						<Link
							key={item.key}
							href={linkHref}
							className={`${baseClass} hover:bg-white dark:hover:bg-white/6 cursor-pointer`}
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
