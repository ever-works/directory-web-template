import { Metadata } from "next";
import { getCachedItemsByTag, type ItemData } from "@/lib/content";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import Listing from "../../listing";
import { getTagsEnabled } from "@/lib/utils/settings";
import { notFound } from "next/navigation";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string[]; locale: string }>;
}): Promise<Metadata> {
  const { tag: tagMeta, locale } = await params;
  const [rawTag, rawPage] = tagMeta;
  const decodedTag = decodeURIComponent(rawTag);
  const formattedTag = toTitleCase(decodedTag);
  const page = rawPage ? parseInt(rawPage) : 1;
  const { total } = await getCachedItemsByTag(decodedTag, { lang: locale });
  const title = page > 1 ? `${formattedTag} Tag - Page ${page}` : `${formattedTag} Tag`;
  const encodedTag = encodeURIComponent(decodedTag);
  const path = page > 1 ? `/tags/${encodedTag}/${page}` : `/tags/${encodedTag}`;

  return generateListingMetadata({
    title,
    path,
    locale,
    itemCount: total,
    keywords: [decodedTag, "tag", "directory", "listings"],
  });
}

export default async function TagListing({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string[]; locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const tagsEnabled = getTagsEnabled();
  if (!tagsEnabled) {
    notFound();
  }

  const { tag: tagMeta, locale } = await params;
  const sp = (await searchParams) ?? {};
  const [rawTag, rawPage] = tagMeta;
  const tag = decodeURI(rawTag);

  // `getCachedItemsByTag` returns items already filtered to the path-encoded
  // tag. We layer additional URL filters (search, sort, extra categories) on
  // top, then slice for the current page. Same Spec 020 rule as the discover
  // route: never ship more than `PER_PAGE` items in the RSC payload.
  const { items: allItems, categories, tags } = await getCachedItemsByTag(tag, { lang: locale });
  const filtered = filterItems(allItems, {
    searchTerm: sp.q,
    selectedCategories: parseCsv(sp.categories),
  });
  const sorted = sortItems(filtered, sp.sort);
  const total = sorted.length;
  const { page, start } = paginateMeta(rawPage);
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
