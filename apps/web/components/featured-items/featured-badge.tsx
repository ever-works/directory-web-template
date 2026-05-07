'use client';

import { Star, Clock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = 'default' | 'compact' | 'expiring' | 'hero';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface FeaturedBadgeProps {
	className?: string;
	variant?: Variant;
	showIcon?: boolean;
	showText?: boolean;
	size?: Size;
	collapsible?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SIZE = {
	xs: { badge: 'gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide', icon: 'size-2.5' },
	sm: { badge: 'gap-1.5 text-xs font-semibold tracking-wide', icon: 'size-4' },
	md: { badge: 'gap-1.5 px-3 py-1 text-xs font-semibold tracking-wider', icon: 'size-3' },
	lg: { badge: 'gap-2 px-4 py-1.5 text-xs font-semibold tracking-widest', icon: 'size-3.5' },
} satisfies Record<Size, { badge: string; icon: string }>;

const VARIANT: Record<Variant, {
	base: string;
	Icon: LucideIcon;
	label: string;
	fill?: boolean;
}> = {
	default: {
		base: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 hover:bg-amber-100 hover:ring-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800/60 dark:hover:bg-amber-900/60',
		Icon: Star,
		label: 'Featured',
		fill: true,
	},
	compact: {
		base: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200/80 hover:bg-yellow-100 dark:bg-yellow-950/60 dark:text-yellow-300 dark:ring-yellow-800/60 dark:hover:bg-yellow-900/60',
		Icon: Star,
		label: 'Featured',
		fill: true,
	},
	expiring: {
		base: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200/80 hover:bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 dark:ring-orange-800/60 dark:hover:bg-orange-900/60',
		Icon: Clock,
		label: 'Expires Soon',
	},
	hero: {
		base: 'text-amber-800 hover:from-amber-100 hover:to-orange-100 dark:from-amber-950/70 dark:to-orange-950/70 dark:text-amber-300',
		Icon: Award,
		label: 'Featured',
		fill: false,
	},
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FeaturedBadge({
	className,
	variant = 'default',
	showIcon = true,
	showText = true,
	size = 'xs',
	collapsible = false,
}: FeaturedBadgeProps) {
	const { base, Icon, label, fill } = VARIANT[variant];
	const { badge, icon } = SIZE[size];

	return (
		<span
			className={cn(
				// layout
				'group inline-flex items-center rounded-md transition-all duration-200',
				// variant colours + ring
				base,
				// size
				badge,
				className,
			)}
		>
			{showIcon && (
				<Icon
					className={cn(icon, 'shrink-0 transition-transform duration-200', fill && 'fill-current')}
					strokeWidth={fill ? 0 : 1.75}
				/>
			)}

			{/* Label — collapses when `collapsible` is true */}
			{(showText || collapsible) && (
				<span
					className={cn(
						'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-out',
						collapsible
							? 'max-w-0 opacity-0 group-hover:max-w-[8rem] group-hover:opacity-100'
							: showText
								? 'max-w-[8rem] opacity-100'
								: 'hidden',
					)}
				>
					{label}
				</span>
			)}
		</span>
	);
}
