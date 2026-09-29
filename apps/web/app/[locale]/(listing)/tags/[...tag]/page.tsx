import { Metadata } from "next";
import { getCachedItemsByTag, type ItemData } from "@/lib/content";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import Listing from "../../listing";
import { getTagsEnabled } from "@/lib/utils/settings";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { resolveAliasPage } from "@/lib/seo/paging";
import { decodeSegment, findTagBySegment } from "@/lib/seo/route-segment";
import { toTitleCase, filterItems } from "@/lib/utils";

// Enable ISR with 10 minutes revalidation
// Using dynamicParams allows on-demand generation without build-time content errors
export const revalidate = 600;
export const dynamicParams = true;

type SearchParams = {
  q?: string;
  sort?: string;
  categories?: string;
};

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function sortItems(items: ItemData[], sort?: string): ItemData[] {
  if (!sort) return items;
  const copy = items.slice();
  switch (sort) {
    case 'name':
    case 'name-asc':
      return copy.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    case 'name-desc':
      return copy.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
    case 'recent':
    case 'updated':
      return copy.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    case 'oldest':
      return copy.sort((a, b) => (a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0));
    default:
      return items;
  }
}

/**
 * What `/tags/<segments>` (two segments or more; one is tags/[tag]) names, or
 * null when it is not a page of this site: tags switched off, an unknown tag,
 * a malformed page segment, a page past the tag's last page, or any segment
 * after the page. This route ignored all of that, so /tags/zz-unknown/2,
 * /tags/<tag>/abc or /tags/paging/2/extra (read as the tag "paging") each
 * answered 200, indexable, with a canonical of its own.
 */
async function resolveTagListing(segments: readonly string[], locale: string) {
  if (!getTagsEnabled()) return null;

  const [rawTag, ...pageSegments] = segments;
  const tag = decodeSegment(rawTag);
  if (tag === null) return null;

  const result = await getCachedItemsByTag(tag, { lang: locale });
  const matchedTag = findTagBySegment(result.tags, tag);
  if (!matchedTag) return null;

  // Pages of the tag's whole listing; URL filters (?q=, ?categories=) only
  // ever shrink it.
  const page = resolveAliasPage(pageSegments, result.total, PER_PAGE);
  if (page === null) return null;

  return { ...result, tag, matchedTag, page };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string[]; locale: string }>;
}): Promise<Metadata> {
  const { tag: tagMeta, locale } = await params;
  const listing = await resolveTagListing(tagMeta, locale);
  if (!listing) {
    notFound();
  }
  const { matchedTag, page, total } = listing;
  // Title and canonical from the tag's id, whatever spelling the URL used
  // (`/tags/Open%20Source/2`, `/tags/OPEN-SOURCE/2`): the URL /tags/<id>
  // publishes.
  const formattedTag = toTitleCase(matchedTag.id);
  const title = page > 1 ? `${formattedTag} Tag - Page ${page}` : `${formattedTag} Tag`;
  const encodedTag = encodeURIComponent(matchedTag.id);
  const path = page > 1 ? `/tags/${encodedTag}/${page}` : `/tags/${encodedTag}`;

  return generateListingMetadata({
    title,
    path,
    locale,
    itemCount: total,
    keywords: [matchedTag.id, "tag", "directory", "listings"],
  });
}

export default async function TagListing({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string[]; locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { tag: tagMeta, locale } = await params;
  const sp = (await searchParams) ?? {};

  // Tags switched off, an unknown tag, or a URL that is not one of the tag's
  // pages: a real 404 (this route has no loading.tsx, so nothing has streamed).
  const listing = await resolveTagListing(tagMeta, locale);
  if (!listing) {
    notFound();
  }

  // `getCachedItemsByTag` returns items already filtered to the path-encoded
  // tag. We layer additional URL filters (search, sort, extra categories) on
  // top, then slice for the current page. Same Spec 020 rule as the discover
  // route: never ship more than `PER_PAGE` items in the RSC payload.
  const { items: allItems, categories, tags, tag } = listing;
  const filtered = filterItems(allItems, {
    searchTerm: sp.q,
    selectedCategories: parseCsv(sp.categories),
  });
  const sorted = sortItems(filtered, sp.sort);
  const total = sorted.length;
  const { page, start } = paginateMeta(listing.page);
  const pageItems = sorted.slice(start, start + PER_PAGE);

  return (
    <Listing
      categories={categories}
      tags={tags}
      items={pageItems}
      start={start}
      page={page}
      total={total}
      basePath={`/tags/${tag}`}
      initialTag={tag}
    />
  );
}
