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
  let collection = collections.find(c => c.slug === slug || c.id === slug);

  if (!collection) {
    try {
      const allCollections = await collectionRepository.findAll({ includeInactive: false });
      collection = allCollections.find((c) => c.slug === slug);
    } catch {
      // Ignore error, fallback already attempted
    }
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

  const { collections, tags, items } = await getCachedItems({ lang: locale });
  let collection = collections.find(c => c.slug === slug || c.id === slug);

  if (!collection) {
    try {
      const allCollections = await collectionRepository.findAll({ includeInactive: false });
      collection = allCollections.find(c => c.slug === slug);
    } catch (_error) {
      logger.warn('Git collection repository not available, falling back to local content');
    }
  }

  if (!collection) {
    notFound();
  }

  // Build a lookup so string tag IDs can be resolved to full tag objects
  const tagMap = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

  const normalizeItemTags = (itemTags: Array<string | { id: string }> = []) =>
    itemTags
      .map((tag) => (typeof tag === "string" ? tagMap[tag] : tagMap[tag?.id]))
      .filter(Boolean);

  // Filter items based on collection's item list
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
