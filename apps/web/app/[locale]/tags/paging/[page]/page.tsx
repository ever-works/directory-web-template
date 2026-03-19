import { getCachedItems } from "@/lib/content";
import { paginateMeta, totalPages } from "@/lib/paginate";
import ListingTags from "../../listing-tags";

// Enable ISR with 10 minutes revalidation
export const revalidate = 600;

// Allow non-English locales to be generated on-demand (ISR)
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only pre-build English locale for optimal build size
  const locale = 'en';
  const { tags } = await getCachedItems({ lang: locale });
  const paths = [];
  const pages = totalPages(tags.length);

  for (let i = 1; i <= pages; ++i) {
    paths.push({ page: i.toString(), locale });
  }

  return paths;
}

// Set per page to 12 for tags (default from config)
const PER_PAGE = 12; // This matches the default in LayoutThemeContext

export default async function TagPagingPage({
  params,
}: {
  params: Promise<{ page: string; locale: string }>;
}) {
  const { page: pageMeta, locale } = await params;
  const rawPage = pageMeta[0] || "1";
  const { start, page } = paginateMeta(rawPage, PER_PAGE);
  const { tags } = await getCachedItems({ lang: locale, sortTags: true });

  // PAGINATE tags here!
  const paginatedTags = tags.slice(start, start + PER_PAGE);

  // Debug log
  console.log({
    page,
    start,
    perPage: PER_PAGE,
    totalTags: tags.length,
    paginatedTags: paginatedTags.length,
    paginatedTagNames: paginatedTags.map(t => t.name)
  });

  return (
    <ListingTags
      total={tags.length}
      page={page}
      basePath="/tags/paging"
      tags={paginatedTags} // <-- Only pass paginated tags!
    />
  );
}
