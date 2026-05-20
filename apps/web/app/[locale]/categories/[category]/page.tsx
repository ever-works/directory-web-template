import { Metadata } from "next";
import { getCachedItems, type ItemData, type Category } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getCategoriesEnabled } from "@/lib/utils/settings";
import { slugify, toTitleCase, filterItems } from "@/lib/utils";
import { paginateMeta, PER_PAGE } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/constants";

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
}: {
  params: Promise<{ category: string; locale: string }>;
}): Promise<Metadata> {
  const { category, locale } = await params;
  const decodedCategory = decodeURIComponent(category);
  const formattedCategory = toTitleCase(decodedCategory);
  const { categories, items } = await getCachedItems({ lang: locale });
  const { id: resolvedCategory } = resolveCategoryId(categories, category);
  const categoryItems = filterItems(items, { selectedCategories: [resolvedCategory] });

  return generateListingMetadata({
    title: `${formattedCategory} Category`,
    path: `/categories/${category}`,
    locale,
    itemCount: categoryItems.length,
    keywords: [decodedCategory, "category", "directory", "listings"],
    hasMarkdownMirror: true,
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
      <Listing
        categories={categories}
        tags={tags}
        items={pageItems}
        total={total}
        start={start}
        page={page}
        basePath={`/categories/${category}`}
        initialCategory={resolvedCategory}
      />
    </>
  );
}
