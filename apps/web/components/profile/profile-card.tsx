'use client';

import Image from 'next/image';
import { FiUser, FiUserCheck } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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

/**
 * Mirrors the FollowPersonCard from `/client/profile/[username]/following`:
 * gradient banner, centered overlapping avatar, centered identity block,
 * footer with primary action + small "view profile" square link.
 */
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
	const t = useTranslations('usersDirectory');

	return (
		<div className="group flex flex-col bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-white/14 transition-all duration-200">
			{/* Gradient banner — uses the theme tokens like the /following card */}
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
					{avatar ? (
						<Image
							src={avatar}
							alt={displayName}
							fill
							sizes="64px"
							className="object-cover"
							unoptimized
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<FiUser className="w-7 h-7 text-neutral-400" aria-hidden="true" />
						</div>
					)}
				</div>
			</div>

			{/* Identity */}
			<div className="flex-1 flex flex-col items-center px-4 pt-3 pb-4 text-center gap-1 min-w-0">
				<Link
					href={`/client/profile/${username}`}
					className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate w-full hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors leading-tight"
				>
					{displayName}
				</Link>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 truncate w-full">
					@{username}
				</p>

				{jobTitle && (
					<p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 truncate w-full mt-0.5">
						{jobTitle}
					</p>
				)}

				{location && (
					<p className="text-[11.5px] text-neutral-500 dark:text-neutral-500 truncate w-full">
						{location}
					</p>
				)}

				{bio && (
					<p className="text-[11.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 line-clamp-2 mt-1 w-full">
						{bio}
					</p>
				)}
			</div>

			{/* Actions */}
			<div className="px-4 pb-4 flex items-center gap-2">
				{isViewer ? (
					<span className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-white/8 bg-transparent select-none cursor-default">
						<FiUserCheck className="w-3.5 h-3.5" aria-hidden="true" />
						{t('YOU_BADGE')}
					</span>
				) : follow ? (
					<div className="flex-1">
						<FollowButton
							username={username}
							initialIsFollowing={follow.initialIsFollowing}
							isAuthenticated={follow.isAuthenticated}
						/>
					</div>
				) : (
					<span className="flex-1" />
				)}
				<Link
					href={`/client/profile/${username}`}
					className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-200 dark:border-white/8 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
					title={t('VIEW_PROFILE')}
					aria-label={`${t('VIEW_PROFILE')} — ${displayName}`}
				>
					<FiUser className="w-3.5 h-3.5" aria-hidden="true" />
				</Link>
			</div>
		</div>
	);
}
