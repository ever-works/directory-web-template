import { CollectionsList } from "@/components/collections";
import { getCachedItems } from "@/lib/content";
import { paginateMeta } from "@/lib/paginate";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { pagingCanonicalPath, pagingTitle, resolveListingPage } from "@/lib/seo/paging";

const COLLECTIONS_PER_PAGE = 6;

/**
 * The active collections and the page this URL names, or `page: null` when
 * the segment is not a page of the collections listing (malformed, or past
 * the last page).
 */
async function resolveCollectionsPage(rawPage: string | undefined, locale: string) {
  const { collections } = await getCachedItems({ lang: locale });
  const activeCollections = collections.filter((collection) => collection.isActive !== false);
  return {
    activeCollections,
    page: resolveListingPage(rawPage, activeCollections.length, COLLECTIONS_PER_PAGE),
  };
}

/**
 * Own metadata instead of the [locale] layout's homepage canonical. Page 1 is
 * the same listing as /collections, so it takes /collections' canonical and
 * title; each later page is canonical to itself with a title of its own.
 * Anything that is not a page of the listing (/collections/paging/abc, or
 * /collections/paging/2 on a site with fewer than 7 collections) is a 404,
 * not an empty listing that claims to be canonical.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}): Promise<Metadata> {
  const { locale, page: rawPage } = await params;
  const { activeCollections, page } = await resolveCollectionsPage(rawPage, locale);
  if (page === null) {
    notFound();
  }

  return generateListingMetadata({
    title: pagingTitle("Collections", page),
    path: pagingCanonicalPath("/collections", page),
    locale,
    itemCount: activeCollections.length,
    keywords: ["collections", "curated", "directory", "lists"],
  });
}

// Force dynamic — collectionRepository / getCachedItems consult
// request-scoped APIs during render. Static rendering throws
// DYNAMIC_SERVER_USAGE → 5xx on the paging probes.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default async function CollectionsPagingPageDynamic({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}) {
  const { locale, page: rawPage } = await params;
  const { activeCollections: allCollections, page: resolvedPage } = await resolveCollectionsPage(rawPage, locale);
  if (resolvedPage === null) {
    notFound();
  }
  const { start, page } = paginateMeta(resolvedPage, COLLECTIONS_PER_PAGE);

  // Sort and paginate collections
  const collator = new Intl.Collator(locale);
  const sortedCollections = allCollections.slice().sort((a, b) => collator.compare(a.name, b.name));
  const paginatedCollections = sortedCollections.slice(start, start + COLLECTIONS_PER_PAGE);

  return (
    <CollectionsList
      collections={paginatedCollections}
      locale={locale}
      total={allCollections.length}
      page={page}
      basePath="/collections/paging"
    />
  );
}
