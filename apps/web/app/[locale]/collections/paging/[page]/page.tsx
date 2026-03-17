import { CollectionsList } from "@/components/collections";
import { getCachedItems } from "@/lib/content";
import { paginateMeta } from "@/lib/paginate";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default async function CollectionsPagingPageDynamic({
  params,
}: {
  params: Promise<{ locale: string; page: string }>;
}) {
  const { locale, page: rawPage } = await params;
  const COLLECTIONS_PER_PAGE = 6;
  const { start, page } = paginateMeta(rawPage, COLLECTIONS_PER_PAGE);

  // Fetch collections from content
  const { collections } = await getCachedItems({ lang: locale });
  const allCollections = collections.filter((collection) => collection.isActive !== false);

  // Sort and paginate collections
  const collator = new Intl.Collator(locale);
  const sortedCollections = allCollections.slice().sort((a, b) => collator.compare(a.name, b.name));
  const paginatedCollections = sortedCollections.slice(start, start + COLLECTIONS_PER_PAGE);

  return (
    <CollectionsList
      collections={paginatedCollections}
      locale={locale}
      total={allCollections.length}
      page={page}
      basePath="/collections/paging"
    />
  );
}
