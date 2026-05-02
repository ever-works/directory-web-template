import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCachedItems } from '@/lib/content';
import { siteConfig } from '@/lib/config';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { getLocationEnabled } from '@/lib/utils/settings';
import { MapPageClient } from './map-page-client';

// ISR — coordinates and items change infrequently; revalidate every 10 min.
export const revalidate = 600;

export async function generateMetadata({
	params
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'listing' });
	return generateListingMetadata({
		title: t('MAP_PAGE_TITLE', { name: siteConfig.name }),
		description: t('MAP_PAGE_DESCRIPTION'),
		path: '/map',
		locale,
		keywords: ['map', 'location', 'directory', 'listings']
	});
}

/**
 * Dedicated full-bleed map page (Spec 017).
 *
 * Returns 404 when location features are disabled, so the route can be
 * deep-linked safely without leaking an empty page.
 */
export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;

	if (!getLocationEnabled()) {
		notFound();
	}

	const { items } = await getCachedItems({ lang: locale });

	return <MapPageClient items={items} />;
}
