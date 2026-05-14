'use client';

import Image from 'next/image';
import { FiUser } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { FollowButton } from './follow-button';

interface ProfileRowProps {
	username: string;
	displayName: string;
	jobTitle?: string | null;
	bio?: string | null;
	avatar?: string | null;
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
	follow
}: ProfileRowProps) {
	return (
		<div className="flex items-center gap-4 p-4 border border-neutral-200 dark:border-white/8 rounded-xl bg-white dark:bg-white/3 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/12 transition-all duration-150">
			<Link
				href={`/client/profile/${username}`}
				className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-white/5 ring-1 ring-neutral-200 dark:ring-white/10 transition-opacity duration-150 hover:opacity-90"
			>
				{avatar ? (
					<Image
						src={avatar}
						alt={displayName}
						width={48}
						height={48}
						className="w-12 h-12 object-cover"
						unoptimized
					/>
				) : (
					<div className="w-12 h-12 flex items-center justify-center">
						<FiUser className="w-5 h-5 text-gray-400" />
					</div>
				)}
			</Link>
			<div className="flex-1 min-w-0">
				<Link
					href={`/client/profile/${username}`}
					className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-theme-primary-600 dark:hover:text-theme-primary-400 truncate block transition-colors duration-150"
				>
					{displayName}
				</Link>
				<div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
					@{username}
					{jobTitle ? ` · ${jobTitle}` : ''}
				</div>
				{bio && (
					<p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{bio}</p>
				)}
			</div>
			{follow && (
				<FollowButton
					username={username}
					initialIsFollowing={follow.initialIsFollowing}
					isAuthenticated={follow.isAuthenticated}
				/>
			)}
		</div>
	);
}
