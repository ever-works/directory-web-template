import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCachedItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { toTitleCase } from "@/lib/utils";
import { resolveCategoryAlias } from "./resolve-category-alias";
import Listing from "../../../(listing)/listing";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/constants";

// Force dynamic — getCachedItemsByCategory / Listing consult request-scoped
// APIs during render, so an on-demand ISR render threw DYNAMIC_SERVER_USAGE
// and every /categories/category/<id> URL answered HTTP 500 (on every
// directory built from this template, e.g. all 125 categories of one Work;
// reproduced locally). Same fix as tags/paging/[page].
export const dynamic = 'force-dynamic';
// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

/**
 * Legacy alias of /categories/<id>. EVERY page of it canonicalises there, with
 * that page's own title: this route hands the whole category to <Listing>
 * without slicing it by page, so /categories/category/<id>/2 or /3 render the
 * same listing as page 1, and /categories/<id> is the URL every internal link,
 * breadcrumb and the sitemap use. (Letting page N point at itself declared an
 * unbounded set of duplicates canonical.) Only the category's real pages
 * answer at all: /abc, /0, /999 or /2/extra are a 404 (resolve-category-alias.ts).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorie: string[]; locale: string }>;
}): Promise<Metadata> {
  const { categorie: categoryMeta, locale } = await params;
  // Categories switched off, an unknown category, or a URL that is not one of
  // its pages: not-found (layout.tsx already answered it with a real 404).
  // Resolving it here also keeps the metadata from naming
  // /categories/<unknown>, a 404, as the canonical.
  const alias = await resolveCategoryAlias(categoryMeta, locale);
  if (!alias) {
    notFound();
  }
  const { matchedCategory, total } = alias;

  // Same title, path and mirror as categories/[category]/page.tsx renders for
  // /categories/<id>, the page this one duplicates.
  return generateListingMetadata({
    title: `${toTitleCase(matchedCategory.id)} Category`,
    path: `/categories/${encodeURIComponent(matchedCategory.id)}`,
    locale,
    itemCount: total,
    keywords: [matchedCategory.id, "category", "directory", "listings"],
    hasMarkdownMirror: true,
  });
}

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  const locale = 'en';
  const { categories } = await getCachedItems({ lang: locale });
  const paths = [];

  for (const category of categories) {
    const pages = totalPages(category.count || 0);

    for (let i = 1; i <= pages; ++i) {
      if (i === 1) {
        paths.push({ categorie: [category.id], locale });
      } else {
        paths.push({ categorie: [category.id, i.toString()], locale });
      }
    }
  }

  return paths;
}

export default async function CategoryListing({
  params,
}: {
  params: Promise<{ categorie: string[]; locale: string }>;
}) {
  const resolvedParams = await params;
  const { categorie: categoryMeta, locale } = resolvedParams;

  // Categories switched off, an unknown category (resolved by id, slugified
  // id or name, e.g. a URL-encoded name with spaces), a malformed page
  // segment (`abc`, `02`), a page past the last one, or segments after the
  // page: not-found, as on /categories/<id>. layout.tsx already answered these
  // with a real 404; this keeps the page from ever rendering one.
  const alias = await resolveCategoryAlias(categoryMeta, locale);
  if (!alias) {
    notFound();
  }
  const { items, categories, total, tags, matchedCategory, page, category } = alias;
  const { start } = paginateMeta(page);
  const resolvedCategory = matchedCategory.id;

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const categoryName = matchedCategory.name ?? toTitleCase(category);
  const breadcrumbItems: { name: string; url?: string }[] = [
    { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
    { name: tCommon("CATEGORIES"), url: `${localePrefix}/categories` },
  ];
  if (page > 1) {
    breadcrumbItems.push({
      name: categoryName,
      // The category's canonical page (see generateMetadata above).
      url: `${localePrefix}/categories/${encodeURIComponent(resolvedCategory)}`,
    });
    breadcrumbItems.push({ name: `Page ${page}` });
  } else {
    breadcrumbItems.push({ name: categoryName });
  }

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <Listing
        total={total}
        start={start}
        page={page}
        basePath={`/categories/category/${resolvedCategory}`}
        categories={categories}
        tags={tags}
        items={items}
        initialCategory={resolvedCategory}
      />
    </>
  );
}
