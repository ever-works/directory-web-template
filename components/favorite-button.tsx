'use client';

import { useState } from 'react';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import { Heart, Star } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLoginModal } from '@/hooks/use-login-modal';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

interface FavoriteButtonProps {
	itemSlug: string;
	itemName: string;
	itemIconUrl?: string;
	itemCategory?: string;
	variant?: 'star' | 'heart';
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	showText?: boolean;
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	hideIndicatorInSimilarProducts?: boolean;
}

export function FavoriteButton({
	itemSlug,
	itemName,
	itemIconUrl,
	itemCategory,
	variant = 'star',
	size = 'md',
	className,
	showText = false,
	position = 'top-right',
	hideIndicatorInSimilarProducts = false
}: FavoriteButtonProps) {
	// All hooks must be called before any early returns
	const { data: session } = useSession();
	const { features, isPending: isFeaturesLoading, isSimulationActive } = useFeatureFlagsWithSimulation();
	const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();
	const [isHovered, setIsHovered] = useState(false);
	const loginModal = useLoginModal();

	// Hide when feature is disabled due to simulation
	if (!isFeaturesLoading && !features.favorites && isSimulationActive) {
		return null;
	}

	// Hide favorite button when feature is disabled (database not configured)
	if (isFeaturesLoading || !features.favorites) {
		return null;
	}

	const isFav = isFavorited(itemSlug);
	const isLoading = isAdding || isRemoving;

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!session?.user?.id) {
			loginModal.onOpen('Please sign in to add favorites');
			return;
		}

		toggleFavorite({
			itemSlug,
			itemName,
			itemIconUrl,
			itemCategory
		});
	};

	const sizeClasses = {
		sm: 'w-6 h-6',
		md: 'w-8 h-8',
		lg: 'w-10 h-10'
	};

	const iconSizes = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-5 h-5'
	};

	const positionClasses = {
		'top-right': 'top-2 right-2',
		'top-left': 'top-2 left-2',
		'bottom-right': 'bottom-2 right-2',
		'bottom-left': 'bottom-2 left-2'
	};

	const IconComponent = variant === 'star' ? Star : Heart;

	return (
		<button
			onClick={handleClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			disabled={isLoading}
			className={cn(
				'group relative flex items-center justify-center rounded-md transition-all duration-300 ease-out',
				'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs border border-gray-200/50 dark:border-gray-700/50',
				'hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600',
				'shadow-xs hover:shadow-md active:scale-95',
				'focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				variant === 'star' && sizeClasses[size],
				variant === 'star' && positionClasses[position],
				className
			)}
			aria-label={isFav ? `Remove ${itemName} from favorites` : `Add ${itemName} to favorites`}
		>
			{/* Background glow effect */}
			{variant === 'star' && (
				<div
					className={cn(
						'absolute inset-0 rounded-full transition-all duration-300',
						isFav
							? 'bg-linear-to-r from-yellow-400/20 to-orange-500/20 dark:from-yellow-400/30 dark:to-orange-500/30'
							: 'bg-linear-to-r from-gray-400/10 to-gray-500/10 dark:from-gray-400/20 dark:to-gray-500/20',
						isHovered && isFav && 'scale-110 opacity-100',
						isHovered && !isFav && 'scale-105 opacity-80'
					)}
				/>
			)}

			{/* Icon */}
			<IconComponent
				className={cn(
					'transition-all duration-300 ease-out',
					iconSizes[size],
					isFav
						? variant === 'star'
							? 'text-yellow-500 fill-yellow-500 dark:text-yellow-400 dark:fill-yellow-400'
							: 'text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400'
						: 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300',
					isHovered && isFav && 'scale-110',
					isHovered && !isFav && 'scale-105',
					isLoading && 'animate-pulse'
				)}
			/>

			{/* Loading spinner */}
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="w-3 h-3 border-2 border-gray-300 border-t-theme-primary-500 rounded-full animate-spin" />
				</div>
			)}

			{/* Text label */}
			{showText && (
				<span
					className={cn(
						'ml-2 text-sm font-medium transition-colors duration-300',
						isFav
							? 'text-gray-700 dark:text-gray-200'
							: 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
						)}
				>
					{isFav ? 'Favorited' : 'Favorite'}
				</span>
			)}

			{/* Tooltip */}
			{variant === 'heart' && (
				<div
					className={cn(
						'absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-800 rounded-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10',
						'after:absolute after:top-full after:left-1/2 after:transform after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-900 dark:after:border-t-gray-800'
					)}
				>
					{isFav ? 'Remove from favorites' : 'Add to favorites'}
				</div>
			)}
		</button>
	);
}
