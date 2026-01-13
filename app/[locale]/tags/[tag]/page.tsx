import { getCachedItems } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getTagsEnabled } from "@/lib/utils/settings";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

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

  return (
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
  );
}
