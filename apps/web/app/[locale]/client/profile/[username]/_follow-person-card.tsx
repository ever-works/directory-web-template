import Image from 'next/image';
import { FiUser, FiUserCheck } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { FollowButton } from '@/components/profile/follow-button';
import type { FollowListRow } from '@/lib/db/queries/follows.queries';

/**
 * Person card shared between the /followers and /following pages so both
 * lists render the same visual treatment (gradient banner, avatar overlap,
 * follow action, view-profile link).
 */
export function FollowPersonCard({
	row,
	isViewer,
	isAuthenticated,
	initialIsFollowing,
	t
}: {
	row: FollowListRow;
	isViewer: boolean;
	isAuthenticated: boolean;
	initialIsFollowing: boolean;
	t: (key: string) => string;
}) {
	const handle = row.username ?? row.userId;
	const displayName = row.displayName || row.name;

	return (
		<div className="group flex flex-col bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-white/14 transition-all duration-200">
			{/* Gradient banner */}
			<div
				className="h-16 w-full shrink-0"
				style={{
					background:
						'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)'
				}}
			/>

			{/* Avatar — overlaps the banner */}
			<div className="flex justify-center -mt-8 px-4">
				<div className="relative w-16 h-16 rounded-full ring-4 ring-white dark:ring-neutral-950 overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow">
					{row.avatar ? (
						<Image
							src={row.avatar}
							alt={displayName}
							fill
							sizes="64px"
							className="object-cover"
							unoptimized
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<FiUser className="w-7 h-7 text-neutral-400" />
						</div>
					)}
				</div>
			</div>

			{/* Identity */}
			<div className="flex-1 flex flex-col items-center px-4 pt-3 pb-4 text-center gap-1 min-w-0">
				<Link
					href={`/client/profile/${handle}`}
					className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate w-full hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors leading-tight"
				>
					{displayName}
				</Link>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 truncate w-full">@{handle}</p>

				{row.jobTitle && (
					<p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 truncate w-full mt-0.5">
						{row.jobTitle}
					</p>
				)}

				{row.bio && (
					<p className="text-[11.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 line-clamp-2 mt-1 w-full">
						{row.bio}
					</p>
				)}
			</div>

			{/* Actions */}
			<div className="px-4 pb-4 flex items-center gap-2">
				{isViewer ? (
					<span className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-white/8 bg-transparent select-none cursor-default">
						<FiUserCheck className="w-3.5 h-3.5" />
						{t('FOLLOWING')}
					</span>
				) : (
					<div className="flex-1">
						<FollowButton
							username={handle}
							initialIsFollowing={initialIsFollowing}
							isAuthenticated={isAuthenticated}
						/>
					</div>
				)}
				<Link
					href={`/client/profile/${handle}`}
					className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-200 dark:border-white/8 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
					title={`View ${displayName}'s profile`}
				>
					<FiUser className="w-3.5 h-3.5" />
				</Link>
			</div>
		</div>
	);
}
