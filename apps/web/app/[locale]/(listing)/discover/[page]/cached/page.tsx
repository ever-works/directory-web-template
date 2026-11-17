import type { Metadata } from 'next';
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
 * The public URL never changes; this path is only a rewrite target.
 */
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
	return DiscoverListing({ params, searchParams: Promise.resolve({}) });
}
