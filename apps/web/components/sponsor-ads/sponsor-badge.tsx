'use client';

import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface SponsorBadgeProps {
	className?: string;
	variant?: 'default' | 'compact' | 'outline';
	showIcon?: boolean;
	showText?: boolean;
	size?: 'sm' | 'md' | 'lg';
}

export function SponsorBadge({
	className,
	variant = 'default',
	showIcon = true,
	showText = true,
	size = 'md'
}: SponsorBadgeProps) {
	const t = useTranslations('sponsor');

	const sizeClasses = {
		sm: 'text-xs px-2 py-0.5',
		md: 'text-sm px-2.5 py-1',
		lg: 'text-base px-3 py-1.5'
	};

	const iconSizes = {
		sm: 'w-3 h-3',
		md: 'w-3.5 h-3.5',
		lg: 'w-4 h-4'
	};

	const label = t('AD_LABEL');

	if (variant === 'compact') {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
					sizeClasses[size],
					className
				)}
				aria-label={!showText ? label : undefined}
			>
				{showIcon && <Megaphone className={cn(iconSizes[size])} />}
				{showText && <span className="font-medium">{label}</span>}
			</div>
		);
	}

	if (variant === 'outline') {
		return (
			<div
				className={cn(
					'inline-flex items-center gap-1 rounded border border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400',
					sizeClasses[size],
					className
				)}
				aria-label={!showText ? label : undefined}
			>
				{showIcon && <Megaphone className={cn(iconSizes[size])} />}
				{showText && <span className="font-medium">{label}</span>}
			</div>
		);
	}

	// Default variant
	return (
		<Badge
			variant="secondary"
			className={cn(
				'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70',
				sizeClasses[size],
				className
			)}
			aria-label={!showText ? label : undefined}
		>
			{showIcon && <Megaphone className={cn(iconSizes[size], 'mr-1')} />}
			{showText && label}
		</Badge>
	);
}
