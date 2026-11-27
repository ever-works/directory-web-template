import { NextRequest, NextResponse } from 'next/server';
import { getEngagementMetricsPerItem, ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';
import { findPublicItemSlugs } from '@/lib/public-item';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export const dynamic = 'force-dynamic';

/**
 * GET /api/items/engagement
 * Fetch engagement metrics for multiple items by their slugs
 * 
 * Query params:
 * - slugs: comma-separated list of item slugs (required)
 * 
 * Returns:
 * - { metrics: Record<string, ItemEngagementMetrics> }
 *
 * A slug with no public item (unknown, draft, pending, rejected or soft-deleted) gets zeros, as an
 * unknown slug, and is not queried (T-2857).
 */
export async function GET(request: NextRequest) {
  try {
    const dbCheck = checkDatabaseAvailability();
    if (dbCheck) {
      return NextResponse.json({ metrics: {} });
    }

    const searchParams = request.nextUrl.searchParams;
    const slugsParam = searchParams.get('slugs');

    if (!slugsParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: slugs' },
        { status: 400 }
      );
    }

    // Parse comma-separated slugs
    const slugs = slugsParam.split(',').map(s => s.trim()).filter(Boolean);

    if (slugs.length === 0) {
      return NextResponse.json({ metrics: {} });
    }

    // Limit to prevent abuse (max 200 items per request)
    if (slugs.length > 200) {
      return NextResponse.json(
        { error: 'Too many slugs. Maximum 200 allowed per request.' },
        { status: 400 }
      );
    }

    // A draft, pending, rejected or soft-deleted item shows no engagement, as an unknown slug,
    // so only public items are queried (T-2857). They come from the cached public listing.
    const publicSlugs = await findPublicItemSlugs(slugs);

    // Fetch engagement metrics
    const metricsMap =
      publicSlugs.size > 0
        ? await getEngagementMetricsPerItem([...publicSlugs])
        : new Map<string, ItemEngagementMetrics>();

    // Convert Map to plain object for JSON response
    const metrics: Record<string, ItemEngagementMetrics> = {};
    metricsMap.forEach((value, key) => {
      metrics[key] = value;
    });
    for (const slug of slugs) {
      if (!publicSlugs.has(slug)) {
        metrics[slug] = { views: 0, votes: 0, favorites: 0, comments: 0, avgRating: 0 };
      }
    }

    return NextResponse.json({ metrics });
  } catch (error) {
    console.warn('[API] Falling back to empty engagement metrics:', error);
    return NextResponse.json({ metrics: {} });
  }
}
