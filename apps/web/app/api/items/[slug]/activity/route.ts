import { NextRequest, NextResponse } from 'next/server';
import {
	getEngagementMetricsPerItem,
	getItemActivityTimeSeries,
	type ItemEngagementMetrics,
	type ItemActivityDay
} from '@/lib/db/queries/engagement.queries';
import { findPublicItem } from '@/lib/public-item';
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export const dynamic = 'force-dynamic';

/**
 * The `days` zero-filled entries an item with no engagement gets: the last `days` UTC days,
 * oldest first and today last, as `getItemActivityTimeSeries` builds them.
 */
function zeroFilledSeries(days: number): ItemActivityDay[] {
	const today = new Date();
	const startUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
	startUtc.setUTCDate(startUtc.getUTCDate() - (days - 1));
	return Array.from({ length: days }, (_, index) => {
		const day = new Date(startUtc);
		day.setUTCDate(day.getUTCDate() + index);
		return { date: day.toISOString().slice(0, 10), views: 0, votes: 0, favorites: 0, comments: 0 };
	});
}

/**
 * GET /api/items/[slug]/activity
 * Engagement totals plus a daily time-series for a single item.
 *
 * Query params:
 * - days: number of days to return (1–90, default 30)
 *
 * Returns:
 *   {
 *     totals: ItemEngagementMetrics,
 *     series: ItemActivityDay[]
 *   }
 *
 * A slug with no public item (unknown, draft, pending, rejected or soft-deleted) returns zero
 * totals and `days` zero-filled entries, with no database query for it (T-2857).
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const dbCheck = checkDatabaseAvailability();
	if (dbCheck) {
		return NextResponse.json({
			totals: { views: 0, votes: 0, favorites: 0, comments: 0, avgRating: 0 } as ItemEngagementMetrics,
			series: [] as ItemActivityDay[]
		});
	}

	const { slug } = await params;
	if (!slug) {
		return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
	}

	const daysParam = request.nextUrl.searchParams.get('days');
	const parsedDays = daysParam ? Number.parseInt(daysParam, 10) : 30;
	const days =
		Number.isFinite(parsedDays) && parsedDays > 0 ? Math.min(Math.max(parsedDays, 1), 90) : 30;

	try {
		// A draft, pending, rejected or soft-deleted item shows no engagement, as an unknown slug (T-2857)
		if (!(await findPublicItem(slug))) {
			return NextResponse.json({
				totals: { views: 0, votes: 0, favorites: 0, comments: 0, avgRating: 0 } as ItemEngagementMetrics,
				series: zeroFilledSeries(days)
			});
		}

		const [totalsMap, series] = await Promise.all([
			getEngagementMetricsPerItem([slug]),
			getItemActivityTimeSeries(slug, days)
		]);

		const totals: ItemEngagementMetrics = totalsMap.get(slug) ?? {
			views: 0,
			votes: 0,
			favorites: 0,
			comments: 0,
			avgRating: 0
		};

		return NextResponse.json({ totals, series });
	} catch (error) {
		console.warn('[API] /api/items/[slug]/activity falling back to empty payload:', error);
		return NextResponse.json({
			totals: { views: 0, votes: 0, favorites: 0, comments: 0, avgRating: 0 } as ItemEngagementMetrics,
			series: [] as ItemActivityDay[]
		});
	}
}
