import { getCachedItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import ListingTags from "../../listing-tags";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { pagingCanonicalPath, pagingTitle } from "@/lib/seo/paging";
import { resolveTagsPage, TAGS_PER_PAGE as PER_PAGE } from "./resolve-tags-page";

/**
 * Own metadata instead of the [locale] layout's homepage canonical. Page 1 is
 * the same listing as /tags, so it takes /tags' canonical and title; each
 * later page is canonical to itself with a title of its own. Anything that is
 * not a page of the listing (/tags/paging/abc, /tags/paging/999) is
 * not-found, not an empty grid that claims to be canonical: layout.tsx
 * answers those with a real 404 before this route's loading.tsx starts
 * streaming.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string; locale: string }>;
}): Promise<Metadata> {
  const { locale, page: rawPage } = await params;
  // Tags switched off (/tags 404s on this site) or not a page of the listing.
  const resolved = await resolveTagsPage(rawPage, locale);
  if (!resolved) {
    notFound();
  }
  const { tags, page } = resolved;

  return generateListingMetadata({
    title: pagingTitle("Tags", page),
    path: pagingCanonicalPath("/tags", page),
    locale,
    itemCount: tags.length,
    keywords: ["tags", "browse", "directory", "labels"],
  });
}

// Force dynamic — getCachedItems consults request-scoped APIs
// during render. Static rendering throws DYNAMIC_SERVER_USAGE → 5xx
// on the paging probes.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  const locale = 'en';
  const { tags } = await getCachedItems({ lang: locale });
  const paths = [];
  const pages = totalPages(tags.length);

  for (let i = 1; i <= pages; ++i) {
    paths.push({ page: i.toString(), locale });
  }

  return paths;
}

export default async function TagPagingPage({
  params,
}: {
  params: Promise<{ page: string; locale: string }>;
}) {
  const { page: pageMeta, locale } = await params;
  // `page` is one segment (a string), not a catch-all array: `pageMeta[0]`
  // took its first CHARACTER, so /tags/paging/10..19 all rendered page 1 while
  // each declared itself canonical. Tags switched off, or not a page of the
  // listing: not-found, as on /tags/paging (layout.tsx already answered it).
  const resolved = await resolveTagsPage(pageMeta, locale);
  if (!resolved) {
    notFound();
  }
  const { tags } = resolved;
  const { start, page } = paginateMeta(resolved.page, PER_PAGE);

  // PAGINATE tags here!
  const paginatedTags = tags.slice(start, start + PER_PAGE);

  // Debug log
  console.log({
    page,
    start,
    perPage: PER_PAGE,
    totalTags: tags.length,
    paginatedTags: paginatedTags.length,
    paginatedTagNames: paginatedTags.map(t => t.name)
  });

  return (
    <ListingTags
      total={tags.length}
      page={page}
      basePath="/tags/paging"
      tags={paginatedTags} // <-- Only pass paginated tags!
    />
  );
}
