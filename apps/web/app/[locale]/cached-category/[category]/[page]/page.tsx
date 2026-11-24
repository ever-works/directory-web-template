import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryListing, { generateMetadata as generateCategoryMetadata } from '../../../categories/[category]/page';

/**
 * Cached (ISR) twin of `/categories/[category]` for requests whose only query
 * parameter is `page` (or none), which is how category pages are linked and
 * crawled (Spec 061).
 *
 * `categories/[category]/page.tsx` reads `searchParams` (q / sort / tags /
 * page), so it has to render on every request. `next.config.ts` rewrites
 * `/<locale>/categories/<category>` and `...?page=<n>` here when none of `q`,
 * `sort`, `tags` is present. Filtered URLs still reach the dynamic route. The
 * public URL never changes. `proxy.ts` answers direct requests for this path
 * with 404, so it is only reachable through the rewrite. It lives
 * outside `categories/` so it cannot collide with `categories/category/[...]`.
 */
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return [];
}

type Params = Promise<{ category: string; page: string; locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
	const { category, page, locale } = await params;
	// The page number is part of the canonical from page 2 on (Spec 062).
	return generateCategoryMetadata({
		params: Promise.resolve({ category, locale }),
		searchParams: Promise.resolve({ page })
	});
}

export default async function CachedCategoryListing({ params }: { params: Params }) {
	const { category, page, locale } = await params;
	// Only real page numbers get a cache entry (the rewrite only sends 1-6 digits).
	if (!/^[1-9]\d{0,5}$/.test(page)) {
		notFound();
	}
	return CategoryListing({
		params: Promise.resolve({ category, locale }),
		searchParams: Promise.resolve({ page })
	});
}
