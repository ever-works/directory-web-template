'use client';

import Image from 'next/image';
import { FiUser, FiMapPin, FiBriefcase, FiArrowUpRight } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FollowButton } from './follow-button';

interface ProfileCardProps {
	username: string;
	displayName: string;
	jobTitle?: string | null;
	bio?: string | null;
	avatar?: string | null;
	location?: string | null;
	isViewer?: boolean;
	follow?: {
		isAuthenticated: boolean;
		initialIsFollowing: boolean;
	};
}

export function ProfileCard({
	username,
	displayName,
	jobTitle,
	bio,
	avatar,
	location,
	isViewer,
	follow
}: ProfileCardProps) {
	const initials = displayName
		.split(' ')
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<article
			className={cn(
				'group relative flex flex-col rounded-2xl border overflow-hidden',
				'border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111]',
				'shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.18)]',
				'hover:border-theme-primary-300 dark:hover:border-theme-primary-700/70',
				'transition-all duration-200 ease-out'
			)}
		>
			{/* Cover band — subtle gradient that picks up the theme primary */}
			<div className="relative h-16 bg-gradient-to-br from-theme-primary-100 via-theme-primary-50 to-theme-primary-200/60 dark:from-theme-primary-900/40 dark:via-theme-primary-900/20 dark:to-theme-primary-800/30">
				<Link
					href={`/client/profile/${username}`}
					aria-label={`View ${displayName}'s profile`}
					className="absolute -bottom-7 left-5 w-14 h-14 rounded-full overflow-hidden ring-4 ring-white dark:ring-[#111111] bg-white dark:bg-white/5"
				>
					{avatar ? (
						<Image
							src={avatar}
							alt={displayName}
							width={56}
							height={56}
							className="w-full h-full object-cover"
							unoptimized
						/>
					) : (
						<span className="flex w-full h-full items-center justify-center text-sm font-semibold text-theme-primary-700 dark:text-theme-primary-300 bg-gradient-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/30">
							{initials || <FiUser className="w-5 h-5" aria-hidden="true" />}
						</span>
					)}
				</Link>
				{isViewer && (
					<span className="absolute top-2 right-2 inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/80 text-theme-primary-700 dark:bg-black/40 dark:text-theme-primary-300 backdrop-blur-sm">
						You
					</span>
				)}
			</div>

			<div className="pt-9 px-5 pb-5 flex-1 flex flex-col">
				<Link
					href={`/client/profile/${username}`}
					className="group/name inline-flex items-center gap-1.5 text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors duration-150 truncate"
				>
					<span className="truncate">{displayName}</span>
					<FiArrowUpRight
						className="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600 group-hover/name:text-theme-primary-500 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-all duration-150"
						aria-hidden="true"
					/>
				</Link>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">@{username}</p>

				{(jobTitle || location) && (
					<div className="flex flex-col gap-1 mt-3 text-xs text-gray-600 dark:text-gray-400">
						{jobTitle && (
							<span className="inline-flex items-center gap-1.5 min-w-0">
								<FiBriefcase className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
								<span className="truncate">{jobTitle}</span>
							</span>
						)}
						{location && (
							<span className="inline-flex items-center gap-1.5 min-w-0">
								<FiMapPin className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
								<span className="truncate">{location}</span>
							</span>
						)}
					</div>
				)}

				{bio ? (
					<p className="text-sm text-gray-600 dark:text-gray-300 mt-3 leading-relaxed line-clamp-2 flex-1">
						{bio}
					</p>
				) : (
					<div className="flex-1" />
				)}

				{follow && (
					<div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
						<FollowButton
							username={username}
							initialIsFollowing={follow.initialIsFollowing}
							isAuthenticated={follow.isAuthenticated}
						/>
					</div>
				)}
			</div>
		</article>
	);
}
