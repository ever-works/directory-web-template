'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Loader2, List, Map as MapIcon } from 'lucide-react';
import { Map as MapComponent } from '@/components/maps/map';
import { MapItemPopup } from '@/components/maps/map-item-popup';
import { MapSidebar } from '@/components/layouts/MapSidebar';
import { useMapCoordinates } from '@/hooks/use-map-coordinates';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { cn } from '@/lib/utils';
import type { MapMarkerData, Coordinates } from '@/lib/maps/types';
import type { ItemData, Category } from '@/lib/content';

interface LayoutMapProps {
	items: ItemData[];
	/**
	 * When true, render the listing-cards sidebar alongside the map (Zillow /
	 * Airbnb style). Defaults to true. Set false for surfaces that have their
	 * own list elsewhere (e.g. small embedded maps).
	 */
	showSidebar?: boolean;
	/**
	 * When true, the layout occupies the entire viewport below the header
	 * (used by the dedicated `/map` route). When false (default), the map
	 * gets a generous but bounded height to coexist with surrounding chrome.
	 */
	fullBleed?: boolean;
}

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
 * Map view with optional listing sidebar.
 *
 * Renders an interactive map with markers for items that have indexed
 * coordinates, and a synchronised sidebar of cards. Selecting a marker
 * highlights its card; selecting a card pans the map to that marker.
 *
 * Spec: docs/spec/017-map-view/spec.md
 */
export default function LayoutMap({ items, showSidebar = true, fullBleed = false }: LayoutMapProps) {
	const locale = useLocale();
	const t = useTranslations('listing');
	const { settings } = useLocationSettings();
	const { coordinates, isLoading } = useMapCoordinates(true);

	const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
	const [panTarget, setPanTarget] = useState<Coordinates | undefined>(undefined);
	const [panZoom, setPanZoom] = useState<number | undefined>(undefined);
	// Mobile-only: which pane is showing.
	const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

	const itemsBySlug = useMemo(() => {
		const map = new Map<string, ItemData>();
		for (const item of items) map.set(item.slug, item);
		return map;
	}, [items]);

	const markers: MapMarkerData[] = useMemo(() => {
		return coordinates
			.filter((coord) => itemsBySlug.has(coord.slug))
			.map((coord) => {
				const item = itemsBySlug.get(coord.slug)!;
				return {
					id: coord.slug,
					coordinates: { latitude: coord.latitude, longitude: coord.longitude },
					title: item.name,
					slug: coord.slug,
					icon: item.icon_url,
					category: getCategoryName(item.category),
					description: item.description
				};
			});
	}, [coordinates, itemsBySlug]);

	// Sidebar items in the same order as markers, so list and map agree.
	const sidebarItems = useMemo(
		() => markers.map((m) => itemsBySlug.get(m.slug)!).filter(Boolean),
		[markers, itemsBySlug]
	);

	const selectedItem = useMemo(
		() => (selectedSlug ? itemsBySlug.get(selectedSlug) ?? null : null),
		[selectedSlug, itemsBySlug]
	);
	const selectedMarker = useMemo(
		() => (selectedSlug ? markers.find((m) => m.slug === selectedSlug) ?? null : null),
		[selectedSlug, markers]
	);

	// Reset selection when items change (e.g. filter changes upstream).
	useEffect(() => {
		if (selectedSlug && !itemsBySlug.has(selectedSlug)) {
			setSelectedSlug(null);
		}
	}, [itemsBySlug, selectedSlug]);

	const handleMarkerClick = useCallback((marker: MapMarkerData) => {
		setSelectedSlug(marker.slug);
		// Don't move the map when the user clicked on the map itself —
		// they're already looking at it. Just highlight in the sidebar.
	}, []);

	const handleSidebarSelect = useCallback(
		(slug: string) => {
			const marker = markers.find((m) => m.slug === slug);
			if (!marker) return;
			setSelectedSlug(slug);
			setPanTarget(marker.coordinates);
			setPanZoom(15);
			// On mobile, jump back to the map so the user sees the result.
			setMobileView('map');
		},
		[markers]
	);

	const handleClosePopup = useCallback(() => {
		setSelectedSlug(null);
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-[500px] bg-gray-50 dark:bg-white/3 rounded-xl">
				<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (markers.length === 0) {
		return (
			<div
				data-testid="map-empty-state"
				className="flex flex-col items-center justify-center h-[400px] bg-gray-50 dark:bg-white/3 rounded-xl"
			>
				<MapPin className="w-12 h-12 text-gray-400 mb-3" />
				<p className="text-sm text-gray-500 dark:text-gray-400">{t('MAP_NO_LOCATION_DATA')}</p>
			</div>
		);
	}

	const mapHeight = fullBleed ? 'calc(100vh - 80px)' : 'calc(100vh - 250px)';

	const mapElement = (
		<div className="relative w-full h-full">
			<MapComponent
				markers={markers}
				center={panTarget ?? settings.defaultCenter}
				zoom={panZoom ?? 3}
				height="100%"
				width="100%"
				enableClustering={true}
				fitToMarkers
				onMarkerClick={handleMarkerClick}
				ariaLabel={t('MAP_SIDEBAR_LABEL')}
			/>

			{/* Item count overlay */}
			<div className="absolute top-4 left-4 z-10 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-md text-sm font-medium text-gray-700 dark:text-gray-200">
				{t(markers.length === 1 ? 'MAP_ITEM_WITH_LOCATION' : 'MAP_ITEMS_WITH_LOCATION', {
					count: markers.length
				})}
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
							description: selectedItem.description
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

	if (!showSidebar) {
		return (
			<div
				className="relative rounded-xl overflow-hidden"
				style={{ height: mapHeight }}
				data-testid="map-view"
			>
				{mapElement}
			</div>
		);
	}

	// Sidebar + map composition (Zillow/Airbnb-style 70/30 split on desktop).
	return (
		<div
			data-testid="map-view"
			className={cn(
				'relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/6',
				'flex flex-col lg:grid lg:grid-cols-[minmax(320px,30%)_1fr]'
			)}
			style={{ height: mapHeight }}
		>
			{/* Mobile pane toggle */}
			<div className="lg:hidden flex items-center justify-center gap-1 p-2 border-b border-gray-200 dark:border-white/6 bg-white/80 dark:bg-[#0a0a0a]/80">
				<button
					type="button"
					onClick={() => setMobileView('map')}
					aria-pressed={mobileView === 'map'}
					className={cn(
						'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
						mobileView === 'map'
							? 'bg-theme-primary text-white'
							: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/4'
					)}
				>
					<MapIcon className="w-3.5 h-3.5" />
					{t('MAP_SHOW_MAP')}
				</button>
				<button
					type="button"
					onClick={() => setMobileView('list')}
					aria-pressed={mobileView === 'list'}
					className={cn(
						'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
						mobileView === 'list'
							? 'bg-theme-primary text-white'
							: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/4'
					)}
				>
					<List className="w-3.5 h-3.5" />
					{t('MAP_SHOW_LIST')}
				</button>
			</div>

			<div className={cn('h-full', mobileView === 'list' ? 'block' : 'hidden lg:block')}>
				<MapSidebar
					items={sidebarItems}
					selectedSlug={selectedSlug}
					onSelect={handleSidebarSelect}
				/>
			</div>

			<div className={cn('h-full', mobileView === 'map' ? 'block' : 'hidden lg:block')}>
				{mapElement}
			</div>
		</div>
	);
}
