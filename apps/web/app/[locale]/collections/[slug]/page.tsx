import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/collections";
import { collectionRepository } from "@/lib/repositories/collection.repository";
import { logger } from "@/lib/logger";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";

// Enable ISR with 10 minutes revalidation
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

  return (
    <CollectionDetail
      collection={collection}
      tags={tags}
      items={collectionItems}
      total={collectionItems.length}
      start={0}
      page={1}
      basePath={`/collections/${slug}`}
    />
  );
}
