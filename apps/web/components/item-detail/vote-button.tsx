'use client';

import { ThumbsUp, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItemVote } from '@/hooks/use-item-vote';
import { useState } from 'react';

interface VoteButtonProps {
	itemId: string;
	className?: string;
}

export function VoteButton({ itemId, className }: VoteButtonProps) {
	const { voteCount, userVote, isLoading, handleVote } = useItemVote(itemId);
	const [isAnimating, setIsAnimating] = useState(false);
	const isVoted = userVote === 'up';

	const handleClick = () => {
		if (!isLoading) {
			setIsAnimating(true);
			handleVote('up');
			setTimeout(() => setIsAnimating(false), 600);
		}
	};

	return (
		<button
			onClick={handleClick}
			disabled={isLoading}
			className={cn(
				'group relative inline-flex items-center justify-center',
				'px-4 py-2 min-w-[88px]',
				'rounded-lg font-semibold text-sm',
				'transition-all duration-300 ease-out',
				'border-2',
				'shadow-md hover:shadow-lg',
				'transform hover:scale-102 active:scale-95',
				'focus:outline-none focus:ring-2 focus:ring-offset-2',
				'overflow-hidden',
				// Base styles
				isVoted
					? 'bg-linear-to-r from-theme-primary-500 to-theme-primary-600 dark:from-theme-primary-600 dark:to-theme-primary-700 text-white border-theme-primary-400 dark:border-theme-primary-500 shadow-theme-primary-500/10 dark:shadow-theme-primary-500/20 focus:ring-theme-primary-500'
					: 'bg-white/95 dark:bg-white/[0.04] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-white/[0.1] hover:border-theme-primary-300 dark:hover:border-theme-primary-600 hover:bg-theme-primary-50/50 dark:hover:bg-theme-primary-900/20 focus:ring-theme-primary-500',
				isLoading && 'cursor-not-allowed opacity-60 pointer-events-none',
				className
			)}
			aria-label={isVoted ? 'Remove upvote' : 'Upvote'}
			title={isVoted ? 'Remove upvote' : 'Upvote'}
		>
			{/* Animated background gradient */}
			{isVoted && (
				<div className="absolute inset-0 bg-linear-to-r from-theme-primary-400 via-theme-primary-500 to-theme-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
			)}

			{/* Pulse effect when voted */}
			{isVoted && <div className="absolute inset-0 rounded-xl bg-theme-primary-400/20 animate-pulse" />}

			{/* Sparkle animation on vote */}
			{isAnimating && !isVoted && (
				<div className="absolute inset-0 flex items-center justify-center">
					<Sparkles className="w-6 h-6 text-theme-primary-500 animate-ping" />
				</div>
			)}

			{/* Content */}
			<div className={cn('relative flex items-center gap-2 z-10', isAnimating && !isVoted && 'opacity-0')}>
				<div className="relative">
					<ThumbsUp
						className={cn(
							'w-4 h-4 transition-all duration-300',
							isVoted
								? 'text-white fill-white scale-105'
								: 'text-gray-600 dark:text-gray-400 group-hover:text-theme-primary-500 dark:group-hover:text-theme-primary-400 group-hover:scale-105',
							isLoading && 'animate-pulse'
						)}
					/>
					{/* Checkmark overlay when voted */}
					{isVoted && (
						<Check className="absolute -top-1 -right-1 w-3 h-3 text-white bg-theme-primary-400 rounded-full p-0.5 animate-in zoom-in duration-300" />
					)}
				</div>

				<span
					className={cn(
						'font-semibold text-sm tabular-nums transition-all duration-300',
						isVoted
							? 'text-white'
							: 'text-gray-700 dark:text-gray-200 group-hover:text-theme-primary-600 dark:group-hover:text-theme-primary-400',
						isAnimating && 'scale-110'
						)}
					aria-live="polite"
					aria-atomic="true"
				>
					{voteCount}
				</span>
			</div>

			{/* Loading spinner */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#0a0a0a]/80 rounded-lg z-20">
					<div className="w-4 h-4 border-2 border-theme-primary-500 border-t-transparent rounded-full animate-spin" />
				</div>
			)}
		</button>
	);
}
