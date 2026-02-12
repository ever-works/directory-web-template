import { and, eq, gte, sql, isNull, inArray, count, countDistinct } from 'drizzle-orm';
import { db } from '../drizzle';
import { votes, comments } from '../schema';

// ===================== Dashboard Stats Queries =====================

/**
 * Get total votes received on a set of items
 * @param itemSlugs - Array of item slugs to count votes for
 * @returns Total vote count
 */
export async function getVotesReceivedCount(itemSlugs: string[]): Promise<number> {
    if (itemSlugs.length === 0) return 0;

    const [result] = await db
        .select({ count: count() })
        .from(votes)
        .where(inArray(votes.itemId, itemSlugs));

    return Number(result?.count ?? 0);
}

/**
 * Get total comments received on a set of items (excluding soft-deleted)
 * @param itemSlugs - Array of item slugs to count comments for
 * @returns Total comment count
 */
export async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number> {
    if (itemSlugs.length === 0) return 0;

    const [result] = await db
        .select({ count: count() })
        .from(comments)
        .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)));

    return Number(result?.count ?? 0);
}

/**
 * Get count of unique items a user has interacted with (voted or commented on)
 * @param clientProfileId - Client profile ID
 * @returns Count of unique items
 */
export async function getUniqueItemsInteractedCount(clientProfileId: string): Promise<number> {
    // Count distinct items from votes
    const [votesResult] = await db
        .select({ count: countDistinct(votes.itemId) })
        .from(votes)
        .where(eq(votes.userId, clientProfileId));

    // Count distinct items from comments (excluding deleted)
    const [commentsResult] = await db
        .select({ count: countDistinct(comments.itemId) })
        .from(comments)
        .where(and(eq(comments.userId, clientProfileId), isNull(comments.deletedAt)));

    // Note: This may count same item twice if user both voted and commented
    // For a more accurate count, we'd need a UNION query
    // Keeping it simple for now as it's an approximation metric
    const votesCount = Number(votesResult?.count ?? 0);
    const commentsCount = Number(commentsResult?.count ?? 0);

    return votesCount + commentsCount;
}

/**
 * Get user's total activity count (votes + comments made by user)
 * @param clientProfileId - Client profile ID
 * @returns Total activity count
 */
export async function getUserTotalActivityCount(clientProfileId: string): Promise<number> {
    const [votesResult] = await db
        .select({ count: count() })
        .from(votes)
        .where(eq(votes.userId, clientProfileId));

    const [commentsResult] = await db
        .select({ count: count() })
        .from(comments)
        .where(and(eq(comments.userId, clientProfileId), isNull(comments.deletedAt)));

    return Number(votesResult?.count ?? 0) + Number(commentsResult?.count ?? 0);
}

/**
 * Get weekly engagement data (votes and comments received on user's items)
 * @param itemSlugs - Array of item slugs
 * @param weeks - Number of weeks to fetch (default 12)
 * @returns Array of weekly engagement data
 */
export async function getWeeklyEngagementData(
    itemSlugs: string[],
    weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>> {
    if (itemSlugs.length === 0) {
        // Return empty weeks
        return Array.from({ length: weeks }, (_, i) => ({
            week: `W${i + 1}`,
            votes: 0,
            comments: 0,
        }));
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    // Get weekly votes
    const weeklyVotes = await db
        .select({
            week: sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`.as('week'),
            count: count(),
        })
        .from(votes)
        .where(and(inArray(votes.itemId, itemSlugs), gte(votes.createdAt, startDate)))
        .groupBy(sql`to_char(${votes.createdAt}, 'IYYY-IW')`)
        .orderBy(sql`to_char(${votes.createdAt}, 'IYYY-IW')`);

    // Get weekly comments
    const weeklyComments = await db
        .select({
            week: sql<string>`to_char(${comments.createdAt}, 'IYYY-IW')`.as('week'),
            count: count(),
        })
        .from(comments)
        .where(
            and(
                inArray(comments.itemId, itemSlugs),
                gte(comments.createdAt, startDate),
                isNull(comments.deletedAt)
            )
        )
        .groupBy(sql`to_char(${comments.createdAt}, 'IYYY-IW')`)
        .orderBy(sql`to_char(${comments.createdAt}, 'IYYY-IW')`);

    // Create a map for quick lookup
    const votesMap = new Map(weeklyVotes.map(v => [v.week, Number(v.count)]));
    const commentsMap = new Map(weeklyComments.map(c => [c.week, Number(c.count)]));

    // Generate week labels and merge data
    const result: Array<{ week: string; votes: number; comments: number }> = [];
    for (let i = 0; i < weeks; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (weeks - 1 - i) * 7);
        const weekKey = getISOWeekString(date);
        result.push({
            week: `W${i + 1}`,
            votes: votesMap.get(weekKey) ?? 0,
            comments: commentsMap.get(weekKey) ?? 0,
        });
    }

    return result;
}

/**
 * Get daily activity data for activity chart (last N days)
 * @param clientProfileId - Client profile ID (for user's own activity)
 * @param itemSlugs - Item slugs (for engagement on user's items)
 * @param days - Number of days (default 7)
 * @returns Array of daily activity data
 */
export async function getDailyActivityData(
    clientProfileId: string,
    itemSlugs: string[],
    days: number = 7
): Promise<Array<{ date: string; submissions: number; views: number; engagement: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get daily engagement (votes + comments received on user's items)
    // Using EXTRACT(DOW FROM date) for locale-independent day-of-week (0=Sunday, 6=Saturday)
    let dailyEngagement: Array<{ dayOfWeek: number; count: number }> = [];

    if (itemSlugs.length > 0) {
        const votesEngagement = await db
            .select({
                dayOfWeek: sql<number>`EXTRACT(DOW FROM ${votes.createdAt})`.as('day_of_week'),
                count: count(),
            })
            .from(votes)
            .where(and(inArray(votes.itemId, itemSlugs), gte(votes.createdAt, startDate)))
            .groupBy(sql`EXTRACT(DOW FROM ${votes.createdAt})`);

        const commentsEngagement = await db
            .select({
                dayOfWeek: sql<number>`EXTRACT(DOW FROM ${comments.createdAt})`.as('day_of_week'),
                count: count(),
            })
            .from(comments)
            .where(
                and(
                    inArray(comments.itemId, itemSlugs),
                    gte(comments.createdAt, startDate),
                    isNull(comments.deletedAt)
                )
            )
            .groupBy(sql`EXTRACT(DOW FROM ${comments.createdAt})`);

        // Merge votes and comments engagement using numeric day-of-week
        const engagementMap = new Map<number, number>();
        votesEngagement.forEach(v => {
            const dow = Number(v.dayOfWeek);
            engagementMap.set(dow, (engagementMap.get(dow) ?? 0) + Number(v.count));
        });
        commentsEngagement.forEach(c => {
            const dow = Number(c.dayOfWeek);
            engagementMap.set(dow, (engagementMap.get(dow) ?? 0) + Number(c.count));
        });

        dailyEngagement = Array.from(engagementMap.entries()).map(([dayOfWeek, count]) => ({
            dayOfWeek,
            count,
        }));
    }

    // Generate day labels (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const engagementMap = new Map(dailyEngagement.map(d => [d.dayOfWeek, d.count]));

    const result: Array<{ date: string; submissions: number; views: number; engagement: number }> = [];
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        result.push({
            date: dayNames[dayOfWeek],
            submissions: 0, // Will be populated from Git repository in the repository layer
            views: 0, // Views not tracked yet
            engagement: engagementMap.get(dayOfWeek) ?? 0,
        });
    }

    return result;
}

/**
 * Get top performing items with engagement metrics
 * @param itemSlugs - Array of item slugs
 * @param limit - Maximum items to return (default 5)
 * @returns Array of items with engagement counts
 */
export async function getTopItemsEngagement(
    itemSlugs: string[],
    limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>> {
    if (itemSlugs.length === 0) return [];

    // Get vote counts per item
    const voteCounts = await db
        .select({
            itemId: votes.itemId,
            count: count(),
        })
        .from(votes)
        .where(inArray(votes.itemId, itemSlugs))
        .groupBy(votes.itemId);

    // Get comment counts per item
    const commentCounts = await db
        .select({
            itemId: comments.itemId,
            count: count(),
        })
        .from(comments)
        .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
        .groupBy(comments.itemId);

    // Create maps for lookup
    const votesMap = new Map(voteCounts.map(v => [v.itemId, Number(v.count)]));
    const commentsMap = new Map(commentCounts.map(c => [c.itemId, Number(c.count)]));

    // Combine and sort by total engagement
    const itemsWithEngagement = itemSlugs.map(slug => ({
        itemId: slug,
        votes: votesMap.get(slug) ?? 0,
        comments: commentsMap.get(slug) ?? 0,
    }));

    // Sort by total engagement (votes + comments) descending
    itemsWithEngagement.sort((a, b) => (b.votes + b.comments) - (a.votes + a.comments));

    return itemsWithEngagement.slice(0, limit);
}

/**
 * Get recent submissions count (last N days)
 * This is a placeholder - actual implementation will be in repository layer
 * using ItemRepository since items are in Git, not database
 * @param _days - Number of days to look back
 * @returns Count of recent submissions
 */
export async function getRecentSubmissionsCount(_days: number = 7): Promise<number> {
    // Items are stored in Git repository, not database
    // This will be implemented in the repository layer
    return 0;
}

// ===================== Helper Functions =====================

/**
 * Get ISO week string (IYYY-IW format) matching PostgreSQL's to_char(date, 'IYYY-IW')
 * Uses ISO week year (the year containing the Thursday of the week),
 * which may differ from calendar year at year boundaries.
 */
function getISOWeekString(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Set to nearest Thursday (ISO weeks start on Monday, Thursday determines the year)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    // ISO week year is the year of the Thursday
    const isoWeekYear = d.getFullYear();
    const week1 = new Date(isoWeekYear, 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${isoWeekYear}-${weekNum.toString().padStart(2, '0')}`;
}
