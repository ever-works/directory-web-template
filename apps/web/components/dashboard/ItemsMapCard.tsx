'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Map } from '@/components/maps';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { CARD_BASE_STYLES, TITLE_STYLES, SUBTITLE_STYLES } from './styles';
import type { MapMarkerData } from '@/lib/maps/types';

interface ClientItemCoords {
	slug: string;
	name: string;
	latitude: number;
	longitude: number;
}

interface CoordinatesResponse {
	success: boolean;
	coordinates: ClientItemCoords[];
}

async function fetchClientItemCoordinates(): Promise<ClientItemCoords[]> {
	const response = await fetch('/api/client/items/coordinates');
	if (!response.ok) throw new Error('Failed to fetch coordinates');
	const json: CoordinatesResponse = await response.json();
	return json.coordinates;
}

const MAP_HEIGHT = 280;
const SKELETON_CONTAINER_STYLES = 'animate-pulse';
const SKELETON_TITLE_STYLES = 'h-4 bg-gray-200 dark:bg-white/[0.08] rounded-sm mb-4 w-1/3';
const SKELETON_MAP_STYLES = 'h-[280px] bg-gray-200 dark:bg-white/[0.08] rounded-sm';
const HEADER_STYLES = 'flex items-center justify-between mb-4';
const BADGE_STYLES =
	'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
const EMPTY_CONTAINER_STYLES =
	'flex items-center justify-center bg-gray-50 dark:bg-white/[0.04] rounded-lg';

export function ItemsMapCard() {
	const t = useTranslations('client.dashboard.ITEMS_MAP');
	const { settings } = useLocationSettings();

	const { data: coordinates = [], isLoading } = useQuery({
		queryKey: ['client-item-coordinates'],
		queryFn: fetchClientItemCoordinates,
		enabled: settings.enabled,
		staleTime: 5 * 60 * 1000,
	});

	if (!settings.enabled) {
		return null;
	}

	if (isLoading) {
		return (
			<div className={CARD_BASE_STYLES}>
				<div className={SKELETON_CONTAINER_STYLES}>
					<div className={SKELETON_TITLE_STYLES} />
					<div className={SKELETON_MAP_STYLES} />
				</div>
			</div>
		);
	}

	const markers: MapMarkerData[] = coordinates.map((item) => ({
		id: item.slug,
		coordinates: { latitude: item.latitude, longitude: item.longitude },
		title: item.name,
		slug: item.slug,
	}));

	return (
		<section className={CARD_BASE_STYLES} aria-labelledby="items-map-title">
			<div className={HEADER_STYLES}>
				<div className="flex items-center gap-2">
					<MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
					<h3 id="items-map-title" className={TITLE_STYLES}>
						{t('TITLE')}
					</h3>
				</div>
				<span className={BADGE_STYLES}>
					{coordinates.length} {t('WITH_LOCATION')}
				</span>
			</div>

			{coordinates.length === 0 ? (
				<div className={EMPTY_CONTAINER_STYLES} style={{ height: MAP_HEIGHT }}>
					<div className="text-center">
						<p className="text-gray-500 dark:text-gray-400">{t('NO_DATA')}</p>
						<p className={SUBTITLE_STYLES}>{t('NO_DATA_DESC')}</p>
					</div>
				</div>
			) : (
				<div className="rounded-lg overflow-hidden">
					<Map
						markers={markers}
						height={MAP_HEIGHT}
						enableClustering={markers.length > 10}
					/>
				</div>
			)}
		</section>
	);
}
