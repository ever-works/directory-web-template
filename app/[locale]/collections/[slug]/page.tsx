import { getCachedItems } from "@/lib/content";
import { notFound } from "next/navigation";
import { CollectionDetail } from "@/components/collections";
import { collectionRepository } from "@/lib/repositories/collection.repository";
import { logger } from "@/lib/logger";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

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
  
  // Fetch collection from Git repository
  let collection = null;
  try {
    const allCollections = await collectionRepository.findAll({ includeInactive: false });
    collection = allCollections.find(c => c.slug === slug);
  } catch (error) {
    logger.error('Error fetching collections', { error });
    // If Git repo not set up, show not found
    notFound();
  }

  if (!collection) {
    notFound();
  }
  
  // Fetch all items
  const { categories, tags, items } = await getCachedItems({ lang: locale });

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
