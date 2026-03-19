import { getCachedItemsByTag } from "@/lib/content";
import { paginateMeta } from "@/lib/paginate";
import Listing from "../../listing";
import { getTagsEnabled } from "@/lib/utils/settings";
import { notFound } from "next/navigation";

// Enable ISR with 10 minutes revalidation
// Using dynamicParams allows on-demand generation without build-time content errors
export const revalidate = 600;
export const dynamicParams = true;

// Remove generateStaticParams to prevent build-time content loading
// export async function generateStaticParams() {
//   async function fetchItemsTags(locale: string) {
//     const { tags } = await fetchItems({ lang: locale });
//     const paths = [];

//     for (const tag of tags) {
//       const pages = totalPages(tag.count || 0);

//       for (let i = 1; i <= pages; ++i) {
//       if (i === 1) {
//         paths.push({ tag: [tag.id], locale });
//       } else {
//         paths.push({ tag: [tag.id, i.toString()], locale });
//       }
//     }
//   }

//   return paths;
// }

//   const params = LOCALES.map((locale) => fetchItemsTags(locale));

//   return (await Promise.all(params)).flat();
// }

export default async function TagListing({
  params,
}: {
  params: Promise<{ tag: string[]; locale: string }>;
}) {
  const tagsEnabled = getTagsEnabled();
  if (!tagsEnabled) {
    notFound();
  }

  const { tag: tagMeta, locale } = await params;
  const [rawTag, rawPage] = tagMeta;
  const tag = decodeURI(rawTag);
  const { start, page } = paginateMeta(rawPage);
  const { items, categories, total, tags } = await getCachedItemsByTag(tag, {
    lang: locale,
  });
  return (
    <Listing
      categories={categories}
      tags={tags}
      items={items}
      start={start}
      page={page}
      total={total}
      basePath={`/tags/${tag}`}
      initialTag={tag}
    />
  );
}
