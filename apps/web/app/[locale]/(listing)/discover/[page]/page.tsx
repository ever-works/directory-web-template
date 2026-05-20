import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { filterItems } from "@/lib/utils";
import { sortItems, parseCsv } from "@/lib/listing-server";
import Listing from "../../listing";

// Force dynamic — the route reads `searchParams` (q / sort / tags /
// categories) to filter & sort items server-side, and ISR was caching
// /discover/1 without including searchParams in the cache key, so
// `?sort=name-desc` was serving the default-order cached HTML. With
// `force-dynamic` every searchParam combo is rendered fresh; the
// catalogue itself stays cached via `getCachedItems`.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

// Searchable / sortable variants live at `?q=…&sort=…` — unbounded combos,
// rendered on demand without static prebuild. The default pageNumbers without
// searchParams stay statically generated / ISR cached. See Spec 020.
export const dynamicParams = true;

// Next.js delivers repeated query params as arrays (e.g. `?q=a&q=b` →
// `q: ['a', 'b']`). Accept the wider shape and squash to a single string
// at read time so downstream filter/sort code (typed for `string`) can't
// trip on it.
type SearchParams = {
  q?: string | string[];
  sort?: string | string[];
  tags?: string | string[];
  categories?: string | string[];
};

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

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
    searchTerm: first(sp.q),
    selectedTags: parseCsv(first(sp.tags)),
    selectedCategories: parseCsv(first(sp.categories)),
  });
  const sorted = sortItems(filtered, first(sp.sort));
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
