import { getCachedItemsByTag, getCachedItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import ListingTags from "../../listing-tags";
import { getTagsEnabled } from "@/lib/utils/settings";
import { notFound } from "next/navigation";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  // Other locales will be generated on-demand and cached via ISR
  const locale = 'en';
  const { tags } = await getCachedItems({ lang: locale });
  const paths = [];

  for (const tag of tags) {
    const pages = totalPages(tag.count || 0);

    for (let i = 1; i <= pages; ++i) {
      if (i === 1) {
        paths.push({ tags: [tag.id], locale });
      } else {
        paths.push({ tags: [tag.id, i.toString()], locale });
      }
    }
  }

  return paths;
}

export default async function TagListing({
  params,
}: {
  params: Promise<{ tags: string[]; locale: string }>;
}) {
  const tagsEnabled = getTagsEnabled();
  if (!tagsEnabled) {
    notFound();
  }

  const resolvedParams = await params;
  const { tags: tagMeta, locale } = resolvedParams;
  const [rawTag, rawPage] = tagMeta;
  const tag = decodeURI(rawTag);
  const { page } = paginateMeta(rawPage || "1");
  const { total, tags } = await getCachedItemsByTag(tag, {
    lang: locale,
  });
  
  return (
      <ListingTags
        total={total}
        page={page}
        basePath={`/tags/tag/${tag}`}
        tags={tags}
      />
  );
} 