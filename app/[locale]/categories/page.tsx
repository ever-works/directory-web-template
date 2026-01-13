import { getCachedItems } from '@/lib/content';
import ListingCategories from './listing-categories';
import { notFound } from 'next/navigation';
import { getCategoriesEnabled } from '@/lib/utils/settings';

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
	// Only pre-build English locale for optimal build size
	return [{ locale: 'en' }];
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
	// Check if categories are enabled
	const categoriesEnabled = getCategoriesEnabled();
	if (!categoriesEnabled) {
		notFound();
	}

	const { locale } = await params;
	const { categories } = await getCachedItems({ lang: locale });

	// Calculate pagination info
	const page = 1;
	const basePath = '/categories';

	return <ListingCategories categories={categories} page={page} basePath={basePath} />;
}
