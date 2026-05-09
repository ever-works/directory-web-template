import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getTagsEnabled } from "@/lib/utils/settings";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { toTitleCase } from "@/lib/utils";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/lib/constants";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string; locale: string }>;
}): Promise<Metadata> {
  const { tag, locale } = await params;
  const decodedTag = decodeURIComponent(tag);
  const formattedTag = toTitleCase(decodedTag);
  const { items } = await getCachedItems({ lang: locale });
  const taggedItems = items.filter((item) =>
    item.tags?.some((t: string | { id: string }) => {
      const tagValue = typeof t === "string" ? t : t?.id;
      return tagValue?.toLowerCase() === decodedTag.toLowerCase();
    })
  );

  return generateListingMetadata({
    title: `${formattedTag} Tag`,
    path: `/tags/${tag}`,
    locale,
    itemCount: taggedItems.length,
    keywords: [decodedTag, "tag", "directory", "listings"],
    hasMarkdownMirror: true,
  });
}

/**
 * Single tag route - renders homepage with tag filter
 * /tags/[tag] shows all items filtered by the tag
 */
export default async function TagListing({
  params,
}: {
  params: Promise<{ tag: string; locale: string }>;
}) {
  const tagsEnabled = getTagsEnabled();
  if (!tagsEnabled) {
    notFound();
  }

  const resolvedParams = await params;
  const { locale, tag } = resolvedParams;

  // Fetch all items (filtering will be done client-side via FilterURLParser)
  const { categories, tags, items } = await getCachedItems({ lang: locale });

  // Calculate pagination info
  const total = items.length;
  const page = 1;
  const start = 0;
  const basePath = `/`; // Use root path for filter URL generation

  // Decode the tag from URL
  const decodedTag = decodeURIComponent(tag);

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const tagName = toTitleCase(decodedTag);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: tCommon("HOME"), url: `${localePrefix || "/"}` },
          { name: tCommon("TAGS"), url: `${localePrefix}/tags` },
          { name: tagName },
        ]}
      />
      <Listing
        categories={categories}
        tags={tags}
        items={items}
        total={total}
        start={start}
        page={page}
        basePath={basePath}
        initialTag={decodedTag}
      />
    </>
  );
}
