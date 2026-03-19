import { NextRequest, NextResponse } from 'next/server';
import { getEngagementMetricsPerItem, ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';
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

    // Fetch engagement metrics
    const metricsMap = await getEngagementMetricsPerItem(slugs);

    // Convert Map to plain object for JSON response
    const metrics: Record<string, ItemEngagementMetrics> = {};
    metricsMap.forEach((value, key) => {
      metrics[key] = value;
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.warn('[API] Falling back to empty engagement metrics:', error);
    return NextResponse.json({ metrics: {} });
  }
}
