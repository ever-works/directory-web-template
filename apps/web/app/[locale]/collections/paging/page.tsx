import { CollectionsList } from "@/components/collections";
import { getCachedItems } from "@/lib/content";
import { paginateMeta } from "@/lib/paginate";
import { Collection } from "@/types/collection";
import type { Metadata } from "next";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";

// Collections per page of this route (the page below renders this many).
const COLLECTIONS_PER_PAGE = 6;

// Page 1 of the paging route. When every active collection fits on it, it
// renders the same listing as /collections, so it takes /collections'
// metadata (collections/page.tsx): canonical, title, description, og:url.
// With more, it shows only the first COLLECTIONS_PER_PAGE while /collections
// shows them all, so it is not a duplicate: it is page 1 of its own series
// and canonical to itself, like /collections/paging/<n>. (Without own
// metadata it inherited the [locale] layout's homepage canonical and title.)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { collections } = await getCachedItems({ lang: locale });
  const activeCount = collections.filter((c) => c.isActive !== false).length;
  return generateListingMetadata({
    title: "Collections",
    path: activeCount > COLLECTIONS_PER_PAGE ? "/collections/paging" : "/collections",
    locale,
    itemCount: activeCount,
    keywords: ["collections", "curated", "directory", "lists"],
  });
}

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  return [{ locale: 'en' }];
}

export default async function CollectionsPagingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { start, page } = paginateMeta(1, COLLECTIONS_PER_PAGE);

  // Fetch collections from content
  const { collections } = await getCachedItems({ lang: locale });

  // Filter active collections only
  const activeCollections = collections.filter((c) => c.isActive !== false);

  // Sort and paginate collections
  const collator = new Intl.Collator(locale);
  const sortedCollections = activeCollections.slice().sort((a: Collection, b: Collection) => collator.compare(a.name, b.name));
  const paginatedCollections = sortedCollections.slice(start, start + COLLECTIONS_PER_PAGE);

  return (
    <CollectionsList
      collections={paginatedCollections}
      locale={locale}
      total={activeCollections.length}
      page={page}
      basePath="/collections/paging"
    />
  );
}
