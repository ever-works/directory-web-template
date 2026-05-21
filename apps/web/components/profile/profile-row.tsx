'use client';

import Image from 'next/image';
import { FiUser, FiMapPin, FiBriefcase } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FollowButton } from './follow-button';

interface ProfileRowProps {
	username: string;
	displayName: string;
	jobTitle?: string | null;
	bio?: string | null;
	avatar?: string | null;
	location?: string | null;
	/** Show a small "You" pill on the viewer's own row. */
	isViewer?: boolean;
	/**
	 * If the viewer is authenticated AND not the same as this row's user, render
	 * the follow button initialized with `initialIsFollowing`. Pass `undefined`
	 * to hide the button entirely (e.g. when the row IS the viewer).
	 */
	follow?: {
		isAuthenticated: boolean;
		initialIsFollowing: boolean;
	};
}

export function ProfileRow({
	username,
	displayName,
	jobTitle,
	bio,
	avatar,
	location,
	isViewer,
	follow
}: ProfileRowProps) {
	const initials = displayName
		.split(' ')
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

	return (
		<div
			className={cn(
				'group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl border',
				'border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111]',
				'shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]',
				'hover:border-theme-primary-300 dark:hover:border-theme-primary-700/70',
				'transition-all duration-200 ease-out'
			)}
		>
			{/* Avatar */}
			<Link
				href={`/client/profile/${username}`}
				className="shrink-0 relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/30 ring-2 ring-white dark:ring-white/5"
				aria-label={`View ${displayName}'s profile`}
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
					<span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-theme-primary-700 dark:text-theme-primary-300">
						{initials || <FiUser className="w-5 h-5" />}
					</span>
				)}
			</Link>

			{/* Identity + meta */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<Link
						href={`/client/profile/${username}`}
						className="font-semibold text-gray-900 dark:text-gray-100 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 truncate transition-colors duration-150"
					>
						{displayName}
					</Link>
					{isViewer && (
						<span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-theme-primary-50 text-theme-primary-700 dark:bg-theme-primary-900/40 dark:text-theme-primary-300">
							You
						</span>
					)}
				</div>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">@{username}</p>

				{(jobTitle || location) && (
					<div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-xs text-gray-600 dark:text-gray-400">
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

				{bio && (
					<p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed line-clamp-2">
						{bio}
					</p>
				)}
			</div>

			{/* Action */}
			{follow && (
				<div className="shrink-0 self-start">
					<FollowButton
						username={username}
						initialIsFollowing={follow.initialIsFollowing}
						isAuthenticated={follow.isAuthenticated}
					/>
				</div>
			)}
		</div>
	);
}
