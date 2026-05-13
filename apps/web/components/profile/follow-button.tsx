'use client';

import { useState } from 'react';
import { FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

interface FollowButtonProps {
	username: string;
	initialIsFollowing: boolean;
	isAuthenticated: boolean;
	onCountsChange?: (counts: { followers: number; following: number }) => void;
}

export function FollowButton({
	username,
	initialIsFollowing,
	isAuthenticated,
	onCountsChange
}: FollowButtonProps) {
	const router = useRouter();
	const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
	const [pending, setPending] = useState(false);

	const handleClick = async () => {
		if (!isAuthenticated) {
			router.push('/auth/signin');
			return;
		}
		if (pending) return;

		setPending(true);
		const previous = isFollowing;
		setIsFollowing(!previous);

		try {
			const path = `/api/user/profile/follow/${encodeURIComponent(username)}`;
			const response = previous
				? await serverClient.delete<{ isFollowing: boolean; followers: number; following: number }>(path)
				: await serverClient.post<{ isFollowing: boolean; followers: number; following: number }>(path);
			if (!apiUtils.isSuccess(response) || !response.data) {
				setIsFollowing(previous);
				toast.error(apiUtils.getErrorMessage(response) || 'Failed to update follow state');
				return;
			}
			setIsFollowing(response.data.isFollowing);
			onCountsChange?.({ followers: response.data.followers, following: response.data.following });
		} catch (error) {
			setIsFollowing(previous);
			console.error('Follow toggle error:', error);
			toast.error('Failed to update follow state');
		} finally {
			setPending(false);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={pending}
			aria-pressed={isFollowing}
			className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-60 w-full ${
				isFollowing
					? 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10'
					: 'bg-theme-primary-600 text-white hover:bg-theme-primary-700'
			}`}
		>
			{isFollowing ? (
				<>
					<FiUserCheck className="w-4 h-4" /> Following
				</>
			) : (
				<>
					<FiUserPlus className="w-4 h-4" /> Follow
				</>
			)}
		</button>
	);
}
