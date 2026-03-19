'use client';

import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DistanceBadgeProps {
	distance: number; // in km
	size?: 'sm' | 'md';
	className?: string;
}

/**
 * Format a distance value for display.
 * < 1 km → meters, < 10 km → 1 decimal, >= 10 km → rounded
 */
function formatDistance(km: number): string {
	if (km < 1) {
		return `${Math.round(km * 1000)} m`;
	}
	if (km < 10) {
		return `${km.toFixed(1)} km`;
	}
	return `${Math.round(km)} km`;
}

const SIZE_CLASSES = {
	sm: 'px-2 py-0.5 text-xs gap-1',
	md: 'px-2.5 py-1 text-sm gap-1.5',
} as const;

const ICON_SIZES = {
	sm: 'w-3 h-3',
	md: 'w-3.5 h-3.5',
} as const;

export function DistanceBadge({ distance, size = 'sm', className }: DistanceBadgeProps) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				'inline-flex items-center font-medium',
				SIZE_CLASSES[size],
				className,
			)}
		>
			<MapPin className={ICON_SIZES[size]} />
			{formatDistance(distance)}
		</Badge>
	);
}
