import { getCachedItems } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getCategoriesEnabled } from "@/lib/utils/settings";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

/**
 * Single category route - renders homepage with category filter
 * /categories/[category] shows all items filtered by the category
 */
export default async function CategoryListing({
  params,
}: {
  params: Promise<{ category: string; locale: string }>;
}) {
  // Check if categories are enabled
  const categoriesEnabled = getCategoriesEnabled();
  if (!categoriesEnabled) {
    notFound();
  }

  const resolvedParams = await params;
  const { locale, category } = resolvedParams;

  // Fetch all items (filtering will be done client-side via FilterURLParser)
  const { categories, tags, items } = await getCachedItems({ lang: locale });

  // Calculate pagination info
  const total = items.length;
  const page = 1;
  const start = 0;
  const basePath = `/`; // Use root path for filter URL generation

  // Decode the category from URL
  const decodedCategory = decodeURIComponent(category);

  return (
    <Listing
      categories={categories}
      tags={tags}
      items={items}
      total={total}
      start={start}
      page={page}
      basePath={basePath}
      initialCategory={decodedCategory}
    />
  );
}
