import { getCachedItems } from '@/lib/content';
import CollectionsGridClient from './collections-grid-client';

// Enable ISR with 10 minutes revalidation
// Admin changes will be visible within 10 minutes (acceptable tradeoff for performance)
export const revalidate = 600;

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

	// Only show active collections publicly
	const activeCollections = collections.filter((c) => c.isActive !== false);

	return <CollectionsGridClient collections={activeCollections} />;
}
