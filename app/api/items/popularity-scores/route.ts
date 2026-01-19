import { NextRequest, NextResponse } from 'next/server';
import { getEngagementMetricsPerItem } from '@/lib/db/queries/engagement.queries';
import { getCachedItems } from '@/lib/content';

export const dynamic = 'force-dynamic';

/**
 * GET /api/items/popularity-scores
 * Debug endpoint to view item popularity scores
 * 
 * Query params:
 * - limit: number of items to return (default: 20, max: 100)
 * - locale: language for items (default: 'en')
 * 
 * Returns items sorted by popularity score with detailed breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const locale = searchParams.get('locale') || 'en';

    // Fetch all items
    const { items } = await getCachedItems({ lang: locale });

    if (items.length === 0) {
      return NextResponse.json({ items: [], message: 'No items found' });
    }

    // Get engagement metrics
    const slugs = items.map(item => item.slug);
    const metricsMap = await getEngagementMetricsPerItem(slugs);

    // Calculate scores and create result
    const itemsWithScores = items.map(item => {
      const engagement = metricsMap.get(item.slug);
      let score = 0;

      // Featured boost
      if (item.featured) {
        score += 10000;
      }

      // Engagement-based scoring
      if (engagement) {
        score += Math.min(engagement.views, 5000);
        score += Math.min(Math.max(engagement.votes * 20, 0), 2000);
        score += Math.min(engagement.avgRating * 500, 2500);
        score += Math.min(engagement.favorites * 30, 3000);
        score += Math.min(engagement.comments * 50, 2500);
      } else {
        // Fallback heuristic
        if (Array.isArray(item.tags)) {
          score += Math.min(item.tags.length * 10, 100);
        }
        if (item.name.length < 20) score += 50;
        else if (item.name.length < 40) score += 25;
        if (item.icon_url) score += 50;
        if (item.promo_code) score += 75;
      }

      // Recency
      const now = Date.now();
      const itemTime = item.updatedAt instanceof Date 
        ? item.updatedAt.getTime() 
        : new Date(item.updatedAt).getTime();
      const ageInDays = (now - itemTime) / (1000 * 60 * 60 * 24);
      
      if (ageInDays < 30) {
        score += 1000 * (1 - ageInDays / 30);
      } else if (ageInDays < 90) {
        score += 500 * (1 - (ageInDays - 30) / 60);
      } else if (ageInDays < 180) {
        score += 250 * (1 - (ageInDays - 90) / 90);
      }

      return {
        rank: 0, // Will be set after sorting
        name: item.name,
        slug: item.slug,
        featured: item.featured || false,
        score: Math.round(score),
        scoreBreakdown: {
          featured: item.featured ? 10000 : 0,
          views: engagement ? Math.min(engagement.views, 5000) : 0,
          votes: engagement ? Math.min(Math.max(engagement.votes * 20, 0), 2000) : 0,
          rating: engagement ? Math.round(Math.min(engagement.avgRating * 500, 2500)) : 0,
          favorites: engagement ? Math.min(engagement.favorites * 30, 3000) : 0,
          comments: engagement ? Math.min(engagement.comments * 50, 2500) : 0,
          recency: Math.round(
            ageInDays < 30 ? 1000 * (1 - ageInDays / 30) :
            ageInDays < 90 ? 500 * (1 - (ageInDays - 30) / 60) :
            ageInDays < 180 ? 250 * (1 - (ageInDays - 90) / 90) : 0
          ),
        },
        engagement: engagement || null,
        ageInDays: Math.round(ageInDays),
      };
    });

    // Sort by score descending
    itemsWithScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

    // Add rank
    itemsWithScores.forEach((item, index) => {
      item.rank = index + 1;
    });

    return NextResponse.json({
      totalItems: items.length,
      showing: Math.min(limit, itemsWithScores.length),
      items: itemsWithScores.slice(0, limit),
    });
  } catch (error) {
    console.error('[API] Error fetching popularity scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popularity scores' },
      { status: 500 }
    );
  }
}
