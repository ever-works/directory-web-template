import { Metadata } from "next";
import { getCachedConfig, getCachedItems, type ItemData, type Category } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getCategoriesEnabled } from "@/lib/utils/settings";
import { slugify, toTitleCase, filterItems } from "@/lib/utils";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { taxonomyDescription, taxonomyTitle } from "@/lib/seo/meta-text";
import { getSiteName } from "@/lib/seo/site-identity";
import { CollectionJsonLd } from "@/components/seo/collection-json-ld";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DEFAULT_LOCALE } from "@/lib/constants";
import { toSearchString } from '@/lib/utils/search-string';

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Search / sort / extra tag-filter variants live at `?q=…&sort=…&tags=…&page=…`,
// served on demand from the server with a cacheable URL per combination.
// Spec 020.
export const dynamicParams = true;

type SearchParams = {
  q?: string;
  sort?: string;
  tags?: string;
  page?: string;
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

function resolveCategoryId(categories: Category[], rawCategory: string): { id: string; matched?: Category } {
  const decoded = decodeURIComponent(rawCategory);
  const slug = slugify(decoded);
  const matched = categories.find(
    (c) => c.id === decoded || c.id === slug || c.name.toLowerCase() === decoded.toLowerCase()
  );
  return { id: matched?.id ?? slug, matched };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; locale: string }>;
  searchParams?: Promise<SearchParams>;
}): Promise<Metadata> {
  const { category, locale } = await params;
  const sp = (await searchParams) ?? {};
  const decodedCategory = decodeURIComponent(category);
  const [{ categories, items }, config, siteName] = await Promise.all([
    getCachedItems({ lang: locale }),
    getCachedConfig(),
    getSiteName(),
  ]);
  const { id: resolvedCategory, matched } = resolveCategoryId(categories, category);
  const categoryItems = filterItems(items, { selectedCategories: [resolvedCategory] });
  // Title and canonical from the category's id, whatever spelling the URL used
  // (/categories/TIME-TRACKING-SOFTWARE, /categories/<name>): each of those
  // answered as its own self-canonical duplicate of /categories/<id>. An
  // unknown category keeps the raw segment; the page below 404s it.
  const categoryName = matched?.name || toTitleCase(matched ? matched.id : decodedCategory);
  const path = matched ? `/categories/${encodeURIComponent(matched.id)}` : `/categories/${category}`;
  // A filtered variant (?q / ?sort / ?tags) canonicalises to the plain
  // listing; a page number is part of the canonical (each page is its own).
  const { page } = paginateMeta(sp.page ?? 1);
  const pageSuffix = page > 1 ? ` – Page ${page}` : "";

  // "<Category> <Items> (N) | <Site>" and the category's own description,
  // else a factual sentence naming its first items (Spec 062).
  return generateListingMetadata({
    title: `${taxonomyTitle({ name: categoryName, itemsName: config.items_name ?? "Items", count: categoryItems.length })}${pageSuffix}`,
    description: taxonomyDescription({
      name: categoryName,
      itemsName: config.items_name ?? "Items",
      count: categoryItems.length,
      siteName,
      description: (matched as { description?: unknown } | undefined)?.description,
      sampleNames: categoryItems.slice(0, 4).map((item) => item.name),
    }),
    path,
    locale,
    itemCount: categoryItems.length,
    keywords: [categoryName, config.items_name ?? "items", "directory"],
    hasMarkdownMirror: true,
    canonicalQuery: page > 1 ? `page=${page}` : undefined,
  });
}

/**
 * Single category route. Server-side filter + sort + slice; URL drives the
 * full filter state (category in the path, q / sort / tags / page in
 * searchParams). The route is ISR-cacheable for any URL combination.
 *
 * Spec 020 — `docs/performance/server-side-listings.md`.
 */
export default async function CategoryListing({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const categoriesEnabled = getCategoriesEnabled();
  if (!categoriesEnabled) {
    notFound();
  }

  const { locale, category } = await params;
  // Sets the request locale for next-intl's server helpers, so they do not read it
  // from the request headers, which makes a page render per request (Spec 061).
  setRequestLocale(locale);
  const sp = (await searchParams) ?? {};

  const { categories, tags, items: allItems } = await getCachedItems({ lang: locale });
  const { id: resolvedCategory, matched: matchedCategory } = resolveCategoryId(categories, category);

  // Unknown category slug → proper 404 (not a soft-404 with empty list).
  if (!matchedCategory) {
    notFound();
  }

  // Server-side: filter by the path-encoded category PLUS any URL filters
  // (search, additional tags), sort, then slice for the current page. See
  // Spec 020 for why this is a hard requirement — previously this route
  // shipped the full ~992-item catalogue (~3.7 MB) on every request.
  const filtered = filterItems(allItems, {
    selectedCategories: [resolvedCategory],
    searchTerm: sp.q,
    selectedTags: parseCsv(sp.tags),
  });
  const sorted = sortItems(filtered, sp.sort);
  const total = sorted.length;
  const { page, start } = paginateMeta(sp.page ?? 1);
  const pageItems = sorted.slice(start, start + PER_PAGE);

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const categoryName = matchedCategory?.name ?? toTitleCase(decodeURIComponent(category));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
          { name: tCommon("CATEGORIES"), url: `${localePrefix}/categories` },
          { name: categoryName },
        ]}
      />
      {/* CollectionPage + ItemList of the items on this page (Spec 062). */}
      <CollectionJsonLd
        name={categoryName}
        description={(matchedCategory as { description?: string }).description}
        // The page's own URL, page number included from page 2 on (like its canonical).
        path={`/categories/${encodeURIComponent(matchedCategory.id)}${page > 1 ? `?page=${page}` : ""}`}
        locale={locale}
        total={total}
        items={pageItems}
      />
      <Listing
        emitBreadcrumbJsonLd={false}
        categories={categories}
        tags={tags}
        items={pageItems}
        total={total}
        start={start}
        page={page}
        basePath={`/categories/${category}`}
        initialCategory={resolvedCategory}
        search={toSearchString(sp)}
      />
    </>
  );
}
