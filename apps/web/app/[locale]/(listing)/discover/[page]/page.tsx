import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { getSiteDescription } from "@/lib/seo/site-identity";
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

  // This route also renders the SITE ROOT. `/` has no page file of its own:
  // next.config.ts rewrites `/:path` -> `/:path/discover/1`, and next-intl's
  // `localePrefix: 'as-needed'` maps `/` -> `/en` first. So a visitor on `/`
  // is served by this component with `page === '1'`.
  //
  // Deriving the canonical from `pageNum` therefore made the homepage announce
  // `<link rel="canonical" href="https://<host>/discover/1">` — it disowned
  // itself in favour of a paginated listing. app/sitemap.ts submits the bare
  // `/` at HOME priority and never submits `/discover/1`, so the sitemap said
  // "index /" while the page said "index /discover/1". Canonical wins, so the
  // most linkable URL on the site was consolidated out of the index.
  //
  // The same `path` also feeds `generateHreflangAlternates`, so every locale
  // alternate plus `x-default` pointed at `/discover/1` too.
  //
  // Pages 2+ are unaffected and keep their own self-referential path.
  //
  // Match page 1 EXACTLY rather than negating `> 1`: `pageNum` comes from
  // `parseInt(page) || 1` and the route does not validate it, so `/discover/-1`
  // is a reachable 200 that renders `sorted.slice(-24, -12)` — twelve real
  // listings that are NOT the homepage's. Under `> 1` it fell into this branch
  // and claimed to be the site root. `=== 1` leaves it self-referential, exactly
  // as it was before the canonical fix. (`/discover/0` and `/discover/abc`
  // coerce to 1 and really do render page-1 content, so they consolidate
  // to the root correctly.)
  //
  // Use "" and not "/" for the root: generateListingMetadata builds
  // `appUrl + (locale === DEFAULT ? "" : "/" + locale) + path`, so "/" yields
  // `https://host/fr/` for the 20 non-default locales — a trailing slash that
  // 308-redirects under `trailingSlash: false` and disagrees with
  // app/sitemap.ts, which submits `${baseUrl}/${locale}` with no slash.
  // "" makes canonical and sitemap byte-identical for every locale.
  const canonicalPath = pageNum === 1 ? "" : `/discover/${pageNum}`;

  return generateListingMetadata({
    title,
    path: canonicalPath,
    locale,
    itemCount: total,
    // Without an explicit description, generateListingMetadata falls through to
    // its default template `Browse ${itemCount} ${title.toLowerCase()}. …`,
    // which rendered as "Browse 3271 discover." — the route slug interpolated
    // where a plural noun belongs. Pass a real sentence instead.
    // Note the helper uses the description verbatim when supplied (it only
    // appends siteConfig.description in the fallback branch), so say the whole
    // thing here rather than leaving a bare fragment.
    description:
      pageNum === 1
        ? `Browse all ${total} listings. ${await getSiteDescription()}`
        : `Browse page ${pageNum} of ${total} listings. ${await getSiteDescription()}`,
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
