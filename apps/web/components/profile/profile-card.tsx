'use client';

import Image from 'next/image';
import { FiUser, FiUserCheck, FiMapPin } from 'react-icons/fi';
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
		<div className="group flex flex-col bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-black/25 hover:border-neutral-300 dark:hover:border-white/14 transition-all duration-200 hover:-translate-y-0.5">
			{/* Gradient banner */}
			<div
				className="h-20 w-full shrink-0"
				style={{
					background:
						'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)'
				}}
			/>

			{/* Avatar — overlaps the banner */}
			<div className="flex justify-center -mt-9 px-4">
				<div className="relative w-[72px] h-[72px] rounded-full ring-4 ring-white dark:ring-neutral-950 overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-md">
					{avatar ? (
						<Image
							src={avatar}
							alt={displayName}
							fill
							sizes="72px"
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
			<div className="flex-1 flex flex-col items-center px-4 pt-2.5 pb-4 text-center gap-0.5 min-w-0">
				<div className="flex items-center justify-center gap-1.5 max-w-full">
					<Link
						href={`/client/profile/${username}`}
						className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors leading-tight"
					>
						{displayName}
					</Link>
					{isViewer && (
						<span className="shrink-0 inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-theme-primary-100 dark:bg-theme-primary-900/40 text-theme-primary-700 dark:text-theme-primary-400">
							{t('YOU_BADGE')}
						</span>
					)}
				</div>

				<p className="text-[11.5px] text-neutral-400 dark:text-neutral-500 truncate w-full">
					@{username}
				</p>

				{jobTitle && (
					<p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 truncate w-full mt-1.5">
						{jobTitle}
					</p>
				)}

				{location && (
					<span className="inline-flex items-center justify-center gap-1 text-[11.5px] text-neutral-400 dark:text-neutral-500 max-w-full mt-0.5">
						<FiMapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
						<span className="truncate">{location}</span>
					</span>
				)}

				{bio && (
					<p className="text-[11.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 line-clamp-2 mt-1.5 w-full">
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
					className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-200 dark:border-white/8 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-theme-primary-50 dark:hover:bg-theme-primary-900/20 hover:border-theme-primary-300 dark:hover:border-theme-primary-700/50 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-all duration-150"
					title={t('VIEW_PROFILE')}
					aria-label={`${t('VIEW_PROFILE')} — ${displayName}`}
				>
					<FiUser className="w-3.5 h-3.5" aria-hidden="true" />
				</Link>
			</div>
		</div>
	);
}
