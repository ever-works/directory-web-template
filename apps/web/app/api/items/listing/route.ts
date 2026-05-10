import { NextRequest, NextResponse } from 'next/server';
import { getCachedItems } from '@/lib/content';
import { paginateMeta, PER_PAGE } from '@/lib/paginate';
import { filterItems } from '@/lib/utils';
import { sortItems, parseCsv } from '@/lib/listing-server';
import { DEFAULT_LOCALE } from '@/lib/constants';

// JSON peer of the SSR listing route. Exists so client-side infinite scroll
// can fetch additional pages without needing the full catalogue in the
// initial payload (Spec 020 server-side slice). Both surfaces share
// `lib/listing-server.ts` so filter/sort/slice output is identical.
export const revalidate = 600;

type ListingResponse = {
  items: unknown[];
  total: number;
  page: number;
  perPage: number;
};

export async function GET(request: NextRequest): Promise<NextResponse<ListingResponse | { error: string }>> {
  const sp = request.nextUrl.searchParams;

  const lang = sp.get('lang') ?? DEFAULT_LOCALE;
  const rawPage = sp.get('page') ?? '1';
  const { page, start } = paginateMeta(rawPage);

  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: 'Invalid page' }, { status: 400 });
  }

  const { items: allItems } = await getCachedItems({ lang });

  const filtered = filterItems(allItems, {
    searchTerm: sp.get('q') ?? undefined,
    selectedTags: parseCsv(sp.get('tags')),
    selectedCategories: parseCsv(sp.get('categories')),
  });
  const sorted = sortItems(filtered, sp.get('sort') ?? undefined);
  const total = sorted.length;
  const pageItems = sorted.slice(start, start + PER_PAGE);

  const response = NextResponse.json({
    items: pageItems,
    total,
    page,
    perPage: PER_PAGE,
  });
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400');
  return response;
}
