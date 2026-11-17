import { Metadata } from "next";
import { setRequestLocale } from 'next-intl/server';
import { getCachedItems } from "@/lib/content";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/collections";
import { collectionRepository } from "@/lib/repositories/collection.repository";
import { logger } from "@/lib/logger";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";
import { getLocalizedUrl } from "@/lib/seo/hreflang";
import { generateBreadcrumbSchema, generateCollectionSchema } from "@/lib/seo/schema";
import { sortItems, SORT_OPTIONS } from "@/components/shared-card/utils/sort-utils";
import type { Locale } from "@/lib/constants";

// Force dynamic rendering — the page consults dynamic APIs
// (cookies / db state inside collectionRepository) during render
// and a static build chokes with DYNAMIC_SERVER_USAGE.
// `revalidate` is no-op under force-dynamic but kept for the day
// the dynamic-usage chain is removed.
export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  const { collections } = await getCachedItems({ lang: locale });
  const normalizedCollection = collections.find((c) => c.slug === slug || c.id === slug);

  let collection = null;
  try {
    const allCollections = await collectionRepository.findAll({ includeInactive: false });
    const repositoryCollection = allCollections.find((c) => c.slug === slug || c.id === slug);
    collection = repositoryCollection && normalizedCollection
      ? { ...repositoryCollection, ...normalizedCollection, items: normalizedCollection.items || repositoryCollection.items }
      : repositoryCollection || normalizedCollection;
  } catch {
    collection = normalizedCollection;
  }

  if (!collection) {
    return generateListingMetadata({
      title: "Collection",
      path: `/collections/${slug}`,
      locale,
    });
  }

  return generateListingMetadata({
    title: collection.name,
    description: collection.description,
    path: `/collections/${slug}`,
    locale,
    itemCount: collection.items?.length,
    keywords: ["collection", collection.name, "curated", "directory"],
    imageUrl: collection.icon_url,
    hasMarkdownMirror: true,
  });
}

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

// Disable static params generation - handle dynamically
export async function generateStaticParams() {
  return [];
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // Static rendering for next-intl: without this, getTranslations()/getLocale()
  // read the request headers and the page renders on every request (Spec 061).
  setRequestLocale(locale);

  const { categories: _categories, tags, items, collections } = await getCachedItems({ lang: locale });
  const normalizedCollection = collections.find((c) => c.slug === slug || c.id === slug);

  let collection = null;
  try {
    const allCollections = await collectionRepository.findAll({ includeInactive: false });
    const repositoryCollection = allCollections.find((c) => c.slug === slug || c.id === slug);
    collection = repositoryCollection && normalizedCollection
      ? { ...repositoryCollection, ...normalizedCollection, items: normalizedCollection.items || repositoryCollection.items }
      : repositoryCollection || normalizedCollection;
  } catch (_error) {
    logger.warn('Git collection repository not available, falling back to local content');
    collection = normalizedCollection;
  }

  if (!collection) {
    notFound();
  }

  const tagMap = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

  const normalizeItemTags = (itemTags: Array<string | { id: string }> = []) =>
    itemTags
      .map((tag) => (typeof tag === "string" ? tagMap[tag] : tagMap[tag?.id]))
      .filter(Boolean);

  const collectionItemIds = collection.items || [];
  const collectionItems = items
    .filter((item) => collectionItemIds.includes(item.slug))
    .map((item) => ({ ...item, tags: normalizeItemTags(item.tags) }));
  const schemaItems = sortItems(
    items.filter((item) => collectionItemIds.includes(item.slug)),
    SORT_OPTIONS.NAME_ASC
  );
  const collectionUrl = getLocalizedUrl(`/collections/${slug}`, locale as Locale);
  const collectionSchema = generateCollectionSchema({
    name: collection.name,
    description: collection.description,
    url: collectionUrl,
    image: collection.icon_url,
    itemCount: collectionItems.length,
    // Same default order the grid opens with (CollectionDetail's FilterProvider starts at "name-asc"),
    // so positions and the 50-item cap match what a visitor sees first.
    items: schemaItems.map((item) => ({
      name: item.name,
      url: getLocalizedUrl(`/items/${item.slug}`, locale as Locale)
    }))
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: getLocalizedUrl("/", locale as Locale) },
    { name: "Collections", url: getLocalizedUrl("/collections", locale as Locale) },
    { name: collection.name, url: collectionUrl }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c")
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c")
        }}
      />
      <CollectionDetail
        collection={collection}
        tags={tags}
        items={collectionItems}
        total={collectionItems.length}
        start={0}
        page={1}
        basePath={`/collections/${slug}`}
      />
    </>
  );
}
