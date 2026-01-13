import { getCachedItemsByCategory, getCachedItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import Listing from "../../../(listing)/listing";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

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
  const [rawCategory, rawPage] = categoryMeta;
  const category = decodeURIComponent(rawCategory);
  
  // Handle pagination
  const page = rawPage ? parseInt(rawPage) : 1;
  const { start } = paginateMeta(page);
  
  // For now, we'll use the original approach
  // In the future, we can implement query parameters here
  const result = await getCachedItemsByCategory(category, { lang: locale });

  const { items, categories, total, tags } = result;

  return (
    <Listing
      total={total}
      start={start}
      page={page}
      basePath={`/categories/category/${category}`}
      categories={categories}
      tags={tags}
      items={items}
      initialCategory={category}
    />
  );
}
