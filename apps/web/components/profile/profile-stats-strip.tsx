import { FiBriefcase, FiHeart, FiMessageCircle, FiSend, FiUserCheck, FiUserPlus } from 'react-icons/fi';

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

const ITEMS: StatItem[] = [
	{ key: 'followers', label: 'Followers', icon: <FiUserPlus className="w-4 h-4" /> },
	{ key: 'following', label: 'Following', icon: <FiUserCheck className="w-4 h-4" /> },
	{ key: 'submissions', label: 'Submissions', icon: <FiSend className="w-4 h-4" /> },
	{ key: 'comments', label: 'Comments', icon: <FiMessageCircle className="w-4 h-4" /> },
	{ key: 'favorites', label: 'Favorites', icon: <FiHeart className="w-4 h-4" /> },
	{ key: 'portfolio', label: 'Portfolio', icon: <FiBriefcase className="w-4 h-4" /> }
];

export function ProfileStatsStrip({ stats }: ProfileStatsStripProps) {
	return (
		<div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
			{ITEMS.map((item) => (
				<div
					key={item.key}
					className="flex flex-col items-center justify-center rounded-lg border border-gray-200 dark:border-white/6 bg-white/60 dark:bg-white/3 px-3 py-2"
				>
					<div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
						{item.icon}
						<span className="text-xs uppercase tracking-wide">{item.label}</span>
					</div>
					<div className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
						{formatCount(stats[item.key])}
					</div>
				</div>
			))}
		</div>
	);
}
