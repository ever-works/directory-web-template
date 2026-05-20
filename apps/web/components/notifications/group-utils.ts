import type { NotificationListItem } from '@/lib/notifications/types';

export type DaySection = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

export interface GroupedSection {
	key: DaySection;
	notifications: NotificationListItem[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Section a flat notification list into day buckets using the user's
 * local clock. Today / Yesterday / This week / Earlier — purely
 * presentational; underlying rows are flat.
 */
export function sectionByDay(items: NotificationListItem[], now = new Date()): GroupedSection[] {
	if (items.length === 0) return [];

	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const startOfYesterday = startOfToday - MS_PER_DAY;
	const startOfWeek = startOfToday - 6 * MS_PER_DAY;

	const buckets: Record<DaySection, NotificationListItem[]> = {
		today: [],
		yesterday: [],
		thisWeek: [],
		earlier: []
	};

	for (const n of items) {
		if (!n || !n.createdAt) continue;
		const ts = new Date(n.createdAt).getTime();
		if (Number.isNaN(ts)) continue;
		if (ts >= startOfToday) buckets.today.push(n);
		else if (ts >= startOfYesterday) buckets.yesterday.push(n);
		else if (ts >= startOfWeek) buckets.thisWeek.push(n);
		else buckets.earlier.push(n);
	}

	const ordered: DaySection[] = ['today', 'yesterday', 'thisWeek', 'earlier'];
	return ordered.filter((k) => buckets[k].length > 0).map((k) => ({ key: k, notifications: buckets[k] }));
}

/**
 * For display: derive the "X other people did this" label from a
 * grouped notification's serialized actor list.
 */
export function describeActors(data: Record<string, unknown> | null): { count: number; primary: string | null } {
	if (!data) return { count: 1, primary: null };
	const actorIds = Array.isArray(data['actorIds']) ? (data['actorIds'] as unknown[]) : [];
	const count = typeof data['count'] === 'number' ? (data['count'] as number) : actorIds.length || 1;
	const primary =
		typeof data['actorUsername'] === 'string'
			? (data['actorUsername'] as string)
			: typeof data['followerUsername'] === 'string'
				? (data['followerUsername'] as string)
				: null;
	return { count, primary };
}
