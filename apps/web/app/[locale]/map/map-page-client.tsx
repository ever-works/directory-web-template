'use client';

import { useTranslations } from 'next-intl';
import LayoutMap from '@/components/layouts/LayoutMap';
import type { ItemData } from '@/lib/content';

interface MapPageClientProps {
	items: ItemData[];
}

/**
 * Client wrapper for the dedicated `/map` route. The map view itself
 * needs to be a client component (the underlying providers are
 * browser-only), but route-level data fetching stays server-side.
 */
export function MapPageClient({ items }: MapPageClientProps) {
	const t = useTranslations('listing');

	return (
		<div className="w-full">
			<h1 className="sr-only">{t('VIEW_MAP')}</h1>
			<LayoutMap items={items} showSidebar fullBleed />
		</div>
	);
}
