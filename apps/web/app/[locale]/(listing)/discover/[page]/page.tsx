import { Metadata } from "next";
import { getCachedItems, type ItemData } from "@/lib/content";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { filterItems } from "@/lib/utils";
import Listing from "../../listing";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Searchable / sortable variants live at `?q=…&sort=…` — unbounded combos,
// rendered on demand without static prebuild. The default pageNumbers without
// searchParams stay statically generated / ISR cached. See Spec 020.
export const dynamicParams = true;

type SearchParams = {
  q?: string;
  sort?: string;
  tags?: string;
  categories?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string; locale: string }>;
}): Promise<Metadata> {
  const { page, locale } = await params;
  const { total } = await getCachedItems({ lang: locale });
  const pageNum = parseInt(page) || 1;
  const title = pageNum > 1 ? `Discover - Page ${pageNum}` : "Discover";

  return generateListingMetadata({
    title,
    path: `/discover/${pageNum}`,
    locale,
    itemCount: total,
    keywords: ["discover", "browse", "directory", "listings"],
  });
}

// Pre-generate first 10 pages for main locales at build time
// Other pages and locales will be generated on-demand (ISR)
export async function generateStaticParams() {
  // Pre-build pages 1-10 for main locales (en, es) to speed up initial load
  // This covers ~80% of user traffic based on typical usage patterns, and also makes sure it works for at least 2 locales
  const mainLocales = ['en', 'es'];
  const pagesToPreBuild = 10; // First 10 pages cover most user navigation

  const params = [];
  for (const locale of mainLocales) {
    for (let page = 1; page <= pagesToPreBuild; page++) {
      params.push({ page: page.toString(), locale });
    }
  }

  return params;
}

/**
 * Sort items by the `?sort=` key, mirroring the previous client-side
 * `sortBy` values. Unknown / unspecified falls through to the natural
 * order returned by `fetchItems` (featured-first + recency).
 */
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

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function DiscoverListing({
  params,
  searchParams,
}: {
  params: Promise<{ page: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { page: rawPage, locale } = await params;
  const sp = (await searchParams) ?? {};

  const { page, start } = paginateMeta(rawPage);
  const { items: allItems, categories, tags } = await getCachedItems({ lang: locale });

  // Server-side filter + sort + slice. Spec 020 — was previously shipping the
  // full 992-item catalogue (~3.7 MB) to every client because pagination /
  // filter / sort all ran in the browser. Now the response is at most
  // `PER_PAGE` items (~5–50 KB) regardless of how big the catalogue grows.
  //
  // Filters / search / sort travel via search params so each combination
  // gets its own cacheable URL. Default pages (no searchParams) stay
  // statically generated.
  const filtered = filterItems(allItems, {
    searchTerm: sp.q,
    selectedTags: parseCsv(sp.tags),
    selectedCategories: parseCsv(sp.categories),
  });
  const sorted = sortItems(filtered, sp.sort);
  const total = sorted.length;
  const pageItems = sorted.slice(start, start + PER_PAGE);

  return (
    <Listing
      tags={tags}
      categories={categories}
      items={pageItems}
      start={start}
      page={page}
      total={total}
      basePath="/discover"
    />
  );
}
