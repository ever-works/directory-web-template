'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MapMarkerProps, Coordinates } from '@/lib/maps/types';
import type { IMapInstance, IMarkerInstance, IMapProvider } from '@/lib/maps/providers/map-provider.interface';

// Icon size configurations
const ICON_SIZES = {
	sm: 'w-6 h-6',
	md: 'w-8 h-8',
	lg: 'w-10 h-10'
} as const;

interface MapMarkerInternalProps extends MapMarkerProps {
	/** Map instance to add marker to */
	mapInstance: IMapInstance;
	/** Provider to use for creating marker */
	provider: IMapProvider;
}

/**
 * Internal MapMarker component that renders a marker on an existing map instance.
 * This component is typically used internally by the Map component.
 *
 * For standalone marker creation, use the provider's createMarker method directly.
 */
export function MapMarkerInternal({
	data,
	mapInstance,
	provider,
	isSelected = false,
	isDraggable = false,
	showIcon = true,
	iconSize = 'md',
	onClick,
	onDragEnd
}: MapMarkerInternalProps): null {
	const markerRef = useRef<IMarkerInstance | null>(null);

	// Refs for callbacks to avoid stale closures
	const onClickRef = useRef(onClick);
	const onDragEndRef = useRef(onDragEnd);
	onClickRef.current = onClick;
	onDragEndRef.current = onDragEnd;

	// Memoize initial marker config to prevent re-creation
	const initialConfig = useMemo(
		() => ({
			data,
			showIcon,
			iconSize,
			isSelected,
			isDraggable
		}),
		// Only use data.id for identity - other changes handled separately
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[data.id]
	);

	// Create and manage marker lifecycle
	useEffect(() => {
		// Create custom marker element
		let iconElement: HTMLElement | undefined;

		if (initialConfig.showIcon && initialConfig.data.icon) {
			iconElement = document.createElement('div');
			iconElement.className = cn(
				'map-marker cursor-pointer transition-transform',
				initialConfig.isSelected && 'scale-110'
			);

			const img = document.createElement('img');
			img.src = initialConfig.data.icon;
			img.alt = initialConfig.data.title;
			img.className = cn(
				ICON_SIZES[initialConfig.iconSize],
				'rounded-full border-2 shadow-md object-cover',
				initialConfig.isSelected ? 'border-blue-500' : 'border-white'
			);
			iconElement.appendChild(img);
		}

		// Create marker
		const marker = provider.createMarker(mapInstance, {
			data: initialConfig.data,
			draggable: initialConfig.isDraggable,
			icon: iconElement
		});

		markerRef.current = marker;

		// Set up click handler using ref to avoid stale closure
		marker.onClick(() => {
			onClickRef.current?.(initialConfig.data);
		});

		// Set up drag end handler using ref to avoid stale closure
		if (initialConfig.isDraggable) {
			marker.onDragEnd((coords: Coordinates) => {
				onDragEndRef.current?.(coords);
			});
		}

		// Cleanup
		return () => {
			marker.remove();
			markerRef.current = null;
		};
	}, [initialConfig, provider, mapInstance]);

	// Update draggable state
	useEffect(() => {
		if (markerRef.current) {
			markerRef.current.setDraggable(isDraggable);
		}
	}, [isDraggable]);

	// Update position when coordinates change
	useEffect(() => {
		if (markerRef.current) {
			markerRef.current.setPosition(data.coordinates);
		}
	}, [data.coordinates]);

	// This component doesn't render anything - the marker is rendered by the map library
	return null;
}

/**
 * Props for the standalone MapMarker display component (for use outside of maps).
 */
interface MapMarkerDisplayProps {
	/** Marker icon URL */
	icon?: string;
	/** Marker title */
	title: string;
	/** Category name */
	category?: string;
	/** Size variant */
	size?: 'sm' | 'md' | 'lg';
	/** Whether marker is selected */
	isSelected?: boolean;
	/** Click handler */
	onClick?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Standalone marker display component for use outside of maps.
 * Useful for marker legends, lists, or preview displays.
 */
export function MapMarkerDisplay({
	icon,
	title,
	category,
	size = 'md',
	isSelected = false,
	onClick,
	className
}: MapMarkerDisplayProps): React.ReactElement {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'inline-flex items-center gap-2 p-2 rounded-lg transition-colors',
				'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
				isSelected && 'bg-blue-50 dark:bg-blue-900/20',
				onClick ? 'cursor-pointer' : 'cursor-default',
				className
			)}
			disabled={!onClick}
		>
			{icon ? (
				<img
					src={icon}
					alt={title}
					className={cn(
						ICON_SIZES[size],
						'rounded-full border-2 shadow-sm object-cover',
						isSelected ? 'border-blue-500' : 'border-gray-200 dark:border-white/[0.06]'
					)}
				/>
			) : (
				<div
					className={cn(
						ICON_SIZES[size],
						'rounded-full border-2 shadow-sm flex items-center justify-center',
						'bg-blue-500 text-white',
						isSelected ? 'border-blue-600' : 'border-blue-400'
					)}
				>
					<svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
			)}
			<div className="text-left">
				<div
					className={cn(
						'font-medium text-gray-900 dark:text-white',
						size === 'sm' && 'text-sm',
						size === 'lg' && 'text-lg'
					)}
				>
					{title}
				</div>
				{category && (
					<div className="text-xs text-gray-500 dark:text-gray-400">{category}</div>
				)}
			</div>
		</button>
	);
}
