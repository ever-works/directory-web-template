import type { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import { totalPages } from "@/lib/paginate";
import ListingTags from "../../listing-tags";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/constants";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { resolveTagAlias } from "./resolve-tag-alias";

// Force dynamic — getCachedItemsByTag consults request-scoped APIs during
// render, so an on-demand ISR render threw and every /tags/tag/<tag> URL
// answered HTTP 500. Same fix as categories/category and tags/paging/[page].
export const dynamic = 'force-dynamic';
// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

/**
 * Own metadata instead of the [locale] layout's, which made every
 * /tags/tag/<tag> URL declare the HOMEPAGE canonical.
 *
 * Every page of this route renders the ALL-TAGS grid (<ListingTags> gets every
 * tag, unsliced, under the "Tags" hero): the content of /tags, not of the
 * tag's own item listing /tags/<id>. So each of them canonicalises to /tags,
 * with /tags' own title and description (tags/page.tsx).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tags: string[]; locale: string }>;
}): Promise<Metadata> {
  const { tags: tagMeta, locale } = await params;
  // Tags switched off (/tags 404s on this site), an unknown tag, or a URL that
  // is not one of its pages: not-found (layout.tsx already answered it with a
  // real 404).
  const alias = await resolveTagAlias(tagMeta, locale);
  if (!alias) {
    notFound();
  }
  const { tags } = alias;

  return generateListingMetadata({
    title: "Tags",
    path: "/tags",
    locale,
    itemCount: tags.length,
    keywords: ["tags", "browse", "directory", "labels"],
  });
}

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  // Other locales will be generated on-demand and cached via ISR
  const locale = 'en';
  const { tags } = await getCachedItems({ lang: locale });
  const paths = [];

  for (const tag of tags) {
    const pages = totalPages(tag.count || 0);

    for (let i = 1; i <= pages; ++i) {
      if (i === 1) {
        paths.push({ tags: [tag.id], locale });
      } else {
        paths.push({ tags: [tag.id, i.toString()], locale });
      }
    }
  }

  return paths;
}

export default async function TagListing({
  params,
}: {
  params: Promise<{ tags: string[]; locale: string }>;
}) {
  const resolvedParams = await params;
  const { tags: tagMeta, locale } = resolvedParams;

  // Tags switched off, an unknown tag, a malformed page segment (`abc`,
  // `02`), a page past the last one, or segments after the page: not-found,
  // as on /tags/<tag>, not the full tag grid under any string. layout.tsx
  // already answered these with a real 404; this keeps the page from ever
  // rendering one.
  const alias = await resolveTagAlias(tagMeta, locale);
  if (!alias) {
    notFound();
  }
  const { total, tags, tag, page } = alias;

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  // The trail of /tags, the page this one renders and canonicalises to (see
  // generateMetadata): naming the tag, or the tag and a page number, described
  // a page the URL does not show.
  const breadcrumbItems: { name: string; url?: string }[] = [
    { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
    { name: tCommon("TAGS") },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <ListingTags
        total={total}
        page={page}
        basePath={`/tags/tag/${tag}`}
        tags={tags}
      />
    </>
  );
}
