'use client';

import { Badge } from '@/components/ui/badge';
import { Star, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedBadgeProps {
	className?: string;
	variant?: 'default' | 'compact' | 'expiring' | 'hero';
	showIcon?: boolean;
	showText?: boolean;
	size?: 'sm' | 'md' | 'lg';
	collapsible?: boolean;
}

export function FeaturedBadge({
	className,
	variant = 'default',
	showIcon = true,
	showText = true,
	size = 'md',
	collapsible = false
}: FeaturedBadgeProps) {
	const sizeClasses = {
		sm: 'text-xs px-2 py-1',
		md: 'text-sm px-3 py-1.5',
		lg: 'text-base px-4 py-2'
	};

	const iconSizes = {
		sm: 'w-3 h-3',
		md: 'w-4 h-4',
		lg: 'w-5 h-5'
	};

	const renderContent = (icon: React.ReactNode, text: string) => {
		if (collapsible) {
			return (
				<>
					{showIcon && icon}
					<div className="overflow-hidden max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 group-hover:ml-1 transition-all duration-300 ease-in-out whitespace-nowrap">
						{text}
					</div>
				</>
			);
		}

		return (
			<>
				{showIcon && icon}
				{showText && text}
			</>
		);
	};

	if (variant === 'compact') {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
					sizeClasses[size],
					className
				)}
			>
				{renderContent(<Star className={cn(iconSizes[size], 'fill-current')} />, 'Featured')}
			</div>
		);
	}

	if (variant === 'expiring') {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
					sizeClasses[size],
					className
				)}
			>
				{renderContent(<Clock className={cn(iconSizes[size])} />, 'Expires Soon')}
			</div>
		);
	}

	if (variant === 'hero') {
		return (
			<div
				className={cn(
					'inline-flex items-center rounded-full bg-linear-to-r from-yellow-100 to-orange-100 text-yellow-800 dark:from-yellow-900 dark:to-orange-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800',
					sizeClasses[size],
					!collapsible && 'gap-2',
					className
				)}
			>
				{renderContent(<Sparkles className={cn(iconSizes[size], 'fill-current')} />, 'Featured')}
			</div>
		);
	}

	// Default variant
	return (
		<Badge
			variant="secondary"
			className={cn(
				'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800',
				sizeClasses[size],
				className
			)}
		>
			{renderContent(<Star className={cn(iconSizes[size], 'fill-current')} />, 'Featured')}
		</Badge>
	);
}
