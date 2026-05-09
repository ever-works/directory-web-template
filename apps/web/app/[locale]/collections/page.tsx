import { Metadata } from 'next';
import { getCachedItems } from '@/lib/content';
import CollectionsGridClient from './collections-grid-client';
import { generateListingMetadata } from '@/lib/seo/listing-metadata';
import { BreadcrumbJsonLd } from '@/components/seo/breadcrumb-json-ld';
import { getTranslations } from 'next-intl/server';
import { DEFAULT_LOCALE } from '@/lib/constants';

// Enable ISR with 10 minutes revalidation
// Admin changes will be visible within 10 minutes (acceptable tradeoff for performance)
export const revalidate = 600;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const { collections } = await getCachedItems({ lang: locale });
	const activeCollections = collections.filter((c) => c.isActive !== false);

	return generateListingMetadata({
		title: 'Collections',
		path: '/collections',
		locale,
		itemCount: activeCollections.length,
		keywords: ['collections', 'curated', 'directory', 'lists'],
	});
}

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
	// Only pre-build English locale for optimal build size
	return [{ locale: 'en' }];
}

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;

	// Fetch collections from YAML content
	const { collections } = await getCachedItems({ lang: locale });
	const tCommon = await getTranslations('common');

	// Only show active collections publicly
	const activeCollections = collections.filter((c) => c.isActive !== false);

	const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
	return (
		<>
			<BreadcrumbJsonLd
				items={[
					{ name: tCommon('HOME'), url: `${localePrefix || '/'}` },
					{ name: 'Collections' }
				]}
			/>
			<CollectionsGridClient collections={activeCollections} />
		</>
	);
}
