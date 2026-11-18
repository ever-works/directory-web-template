import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DiscoverListing, { generateMetadata as generateDiscoverMetadata } from '../page';

/**
 * Cached (ISR) twin of `/discover/[page]` for requests WITHOUT filter or sort
 * query parameters, which is the home page and plain pagination (Spec 061).
 *
 * `../page.tsx` reads `searchParams`, so it has to render on every request.
 * `next.config.ts` rewrites the root (`/`, `/<locale>`), `/discover` and
 * `/discover/<n>` here when none of `q`, `sort`, `tags`, `categories` is in the
 * query string, so the common case is rendered once and then served from the
 * cache (and is cacheable by a CDN). Filtered URLs still reach `../page.tsx`.
 * The public URL never changes. `proxy.ts` answers direct requests for this
 * path with 404, so it is only reachable through the rewrite.
 */
// 600 s is an upper bound. Where the item listing fits Next's Data Cache (< 2 MB), its
// 60-second `unstable_cache` entry (CACHE_TTL.LISTING, kept short so a partially repaired
// listing cannot linger) lowers this page's lifetime, and its `s-maxage`, to 60 s. The page
// is still served from the cache and regenerated in the background at most once a minute.
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return [];
}

type Params = Promise<{ page: string; locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
	return generateDiscoverMetadata({ params });
}

export default async function CachedDiscoverListing({ params }: { params: Params }) {
	// Only real page numbers get a cache entry (the rewrite only sends 1-6 digits).
	if (!/^[1-9]\d{0,5}$/.test((await params).page)) {
		notFound();
	}
	return DiscoverListing({ params, searchParams: Promise.resolve({}) });
}
