'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { MapClusterData } from '@/lib/maps/types';

// Cluster size thresholds and their corresponding styles
const CLUSTER_SIZE_STYLES = {
	small: {
		threshold: 10,
		size: 'w-8 h-8',
		textSize: 'text-xs',
		bgColor: 'bg-blue-400'
	},
	medium: {
		threshold: 50,
		size: 'w-10 h-10',
		textSize: 'text-sm',
		bgColor: 'bg-yellow-400'
	},
	large: {
		threshold: Infinity,
		size: 'w-12 h-12',
		textSize: 'text-base',
		bgColor: 'bg-pink-400'
	}
} as const;

/**
 * Get cluster style based on marker count.
 */
function getClusterStyle(count: number): (typeof CLUSTER_SIZE_STYLES)[keyof typeof CLUSTER_SIZE_STYLES] {
	if (count < CLUSTER_SIZE_STYLES.small.threshold) {
		return CLUSTER_SIZE_STYLES.small;
	}
	if (count < CLUSTER_SIZE_STYLES.medium.threshold) {
		return CLUSTER_SIZE_STYLES.medium;
	}
	return CLUSTER_SIZE_STYLES.large;
}

/**
 * Format cluster count for display.
 * Shows "99+" for counts over 99.
 */
function formatClusterCount(count: number): string {
	if (count > 99) {
		return '99+';
	}
	return count.toString();
}

interface ClusterDisplayProps {
	/** Number of markers in the cluster */
	count: number;
	/** Click handler */
	onClick?: () => void;
	/** Additional CSS classes */
	className?: string;
	/** Whether the cluster is selected/highlighted */
	isSelected?: boolean;
}

/**
 * Standalone cluster display component for use outside of maps.
 * Useful for cluster legends or list displays.
 */
export function ClusterDisplay({
	count,
	onClick,
	className,
	isSelected = false
}: ClusterDisplayProps): React.ReactElement {
	const style = getClusterStyle(count);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'rounded-full flex items-center justify-center font-medium text-white shadow-md border-2 border-white transition-transform',
				style.size,
				style.textSize,
				style.bgColor,
				onClick && 'cursor-pointer hover:scale-110',
				isSelected && 'ring-2 ring-blue-500 ring-offset-2',
				className
			)}
			disabled={!onClick}
			aria-label={`Cluster with ${count} markers`}
		>
			{formatClusterCount(count)}
		</button>
	);
}

interface ClusterListProps {
	/** List of clusters to display */
	clusters: MapClusterData[];
	/** Called when a cluster is clicked */
	onClusterClick?: (cluster: MapClusterData) => void;
	/** Currently selected cluster ID */
	selectedClusterId?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Component to display a list of clusters.
 * Useful for showing cluster information in a sidebar or panel.
 */
export function ClusterList({
	clusters,
	onClusterClick,
	selectedClusterId,
	className
}: ClusterListProps): React.ReactElement {
	if (clusters.length === 0) {
		return (
			<div className={cn('text-sm text-gray-500 dark:text-gray-400 text-center py-4', className)}>
				No clusters to display
			</div>
		);
	}

	return (
		<div className={cn('space-y-2', className)}>
			{clusters.map((cluster) => (
				<button
					key={cluster.id}
					type="button"
					onClick={() => onClusterClick?.(cluster)}
					className={cn(
						'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
						'hover:bg-gray-100 dark:hover:bg-white/[0.06]',
						selectedClusterId === cluster.id && 'bg-blue-50 dark:bg-blue-900/20'
					)}
				>
					<ClusterDisplay count={cluster.count} isSelected={selectedClusterId === cluster.id} />
					<div className="text-left">
						<div className="font-medium text-gray-900 dark:text-white">
							{cluster.count} items
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							Zoom level {cluster.expansionZoom} to expand
						</div>
					</div>
				</button>
			))}
		</div>
	);
}

/**
 * Create a cluster marker element for use with map providers.
 * This returns an HTMLElement that can be used as a custom marker.
 */
export function createClusterElement(count: number): HTMLElement {
	const style = getClusterStyle(count);

	const element = document.createElement('div');
	element.className = cn(
		'rounded-full flex items-center justify-center font-medium text-white shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110',
		style.size,
		style.textSize,
		style.bgColor
	);
	element.textContent = formatClusterCount(count);
	element.setAttribute('role', 'button');
	element.setAttribute('aria-label', `Cluster with ${count} markers`);

	return element;
}

// Re-export types
export type { MapClusterData };
