import { Metadata } from "next";
import { getCachedItems } from "@/lib/content";
import Listing from "../../(listing)/listing";
import { notFound } from "next/navigation";
import { getCategoriesEnabled } from "@/lib/utils/settings";
import { slugify, toTitleCase } from "@/lib/utils";
import { generateListingMetadata } from "@/lib/seo/listing-metadata";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; locale: string }>;
}): Promise<Metadata> {
  const { category, locale } = await params;
  const decodedCategory = decodeURIComponent(category);
  const formattedCategory = toTitleCase(decodedCategory);
  const { categories, items } = await getCachedItems({ lang: locale });
  const slug = slugify(decodedCategory);
  const matchedCategory = categories.find(
    (c) => c.id === decodedCategory || c.id === slug || c.name.toLowerCase() === decodedCategory.toLowerCase()
  );
  const resolvedCategory = matchedCategory?.id ?? slug;
  const categoryItems = items.filter((item) => {
    const categoryValue = item.category;

    if (!categoryValue) return false;
    if (Array.isArray(categoryValue)) {
      return categoryValue.some((entry) =>
        typeof entry === "string" ? entry === resolvedCategory : entry?.id === resolvedCategory
      );
    }

    return typeof categoryValue === "string"
      ? categoryValue === resolvedCategory
      : categoryValue.id === resolvedCategory;
  });

  return generateListingMetadata({
    title: `${formattedCategory} Category`,
    path: `/categories/${category}`,
    locale,
    itemCount: categoryItems.length,
    keywords: [decodedCategory, "category", "directory", "listings"],
  });
}

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

  // Decode the category from URL and resolve to a known category ID
  const decodedCategory = decodeURIComponent(category);
  const slug = slugify(decodedCategory);
  const matchedCategory = categories.find(
    (c) => c.id === decodedCategory || c.id === slug
      || c.name.toLowerCase() === decodedCategory.toLowerCase()
  );
  const resolvedCategory = matchedCategory?.id ?? slug;

  return (
    <Listing
      categories={categories}
      tags={tags}
      items={items}
      total={total}
      start={start}
      page={page}
      basePath={basePath}
      initialCategory={resolvedCategory}
    />
  );
}
