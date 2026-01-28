'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { MapPin, Loader2 } from 'lucide-react';
import { Map as MapComponent } from '@/components/maps/map';
import { MapItemPopup } from '@/components/maps/map-item-popup';
import { useMapCoordinates } from '@/hooks/use-map-coordinates';
import { useLocationSettings } from '@/hooks/use-location-settings';
import type { MapMarkerData } from '@/lib/maps/types';
import type { ItemData, Category } from '@/lib/content';

interface LayoutMapProps {
	items: ItemData[];
}

/**
 * Extract a display-friendly category name from ItemData.category,
 * which can be a string, Category object, or array of either.
 */
function getCategoryName(category: ItemData['category']): string | undefined {
	if (!category) return undefined;
	if (typeof category === 'string') return category;
	if (Array.isArray(category)) {
		const first = category[0];
		if (!first) return undefined;
		return typeof first === 'string' ? first : (first as Category).name;
	}
	return (category as Category).name;
}

/**
 * Map view layout component.
 * Renders an interactive map with markers for items that have location data.
 * Replaces the grid/list view when map mode is active.
 */
export default function LayoutMap({ items }: LayoutMapProps) {
	const locale = useLocale();
	const { settings } = useLocationSettings();
	const { coordinates, isLoading } = useMapCoordinates(true);
	const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);

	// Build a lookup from slug -> ItemData for merging with coordinates
	const itemsBySlug = useMemo(() => {
		const map = new Map<string, ItemData>();
		for (const item of items) {
			map.set(item.slug, item);
		}
		return map;
	}, [items]);

	// Build markers by merging coordinates with item metadata,
	// only for items that exist in the current filtered set
	const markers: MapMarkerData[] = useMemo(() => {
		return coordinates
			.filter((coord) => itemsBySlug.has(coord.slug))
			.map((coord) => {
				const item = itemsBySlug.get(coord.slug)!;
				return {
					id: coord.slug,
					coordinates: {
						latitude: coord.latitude,
						longitude: coord.longitude,
					},
					title: item.name,
					slug: coord.slug,
					icon: item.icon_url,
					category: getCategoryName(item.category),
					description: item.description,
				};
			});
	}, [coordinates, itemsBySlug]);

	// Find the selected item data for the popup
	const selectedItem = useMemo(() => {
		if (!selectedMarker) return null;
		return itemsBySlug.get(selectedMarker.slug) ?? null;
	}, [selectedMarker, itemsBySlug]);

	const handleMarkerClick = useCallback((marker: MapMarkerData) => {
		setSelectedMarker(marker);
	}, []);

	const handleClosePopup = useCallback(() => {
		setSelectedMarker(null);
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-[500px] bg-gray-50 dark:bg-gray-900/50 rounded-xl">
				<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (markers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-900/50 rounded-xl">
				<MapPin className="w-12 h-12 text-gray-400 mb-3" />
				<p className="text-sm text-gray-500 dark:text-gray-400">
					No items with location data found
				</p>
			</div>
		);
	}

	return (
		<div className="relative rounded-xl overflow-hidden">
			<MapComponent
				markers={markers}
				center={settings.defaultCenter}
				zoom={3}
				height="calc(100vh - 250px)"
				enableClustering={true}
				onMarkerClick={handleMarkerClick}
				ariaLabel="Items map view"
			/>

			{/* Item count overlay */}
			<div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-md text-sm font-medium text-gray-700 dark:text-gray-200">
				{markers.length} {markers.length === 1 ? 'item' : 'items'} with location
			</div>

			{/* Selected item popup */}
			{selectedMarker && selectedItem && (
				<div className="absolute bottom-4 left-4 z-20">
					<MapItemPopup
						item={{
							slug: selectedItem.slug,
							name: selectedItem.name,
							icon: selectedItem.icon_url,
							category: getCategoryName(selectedItem.category),
							description: selectedItem.description,
						}}
						isOpen={true}
						position={selectedMarker.coordinates}
						onClose={handleClosePopup}
						locale={locale}
					/>
				</div>
			)}
		</div>
	);
}
