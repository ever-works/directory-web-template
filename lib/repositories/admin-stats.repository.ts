import { db } from '@/lib/db/drizzle';
import { users, comments, votes, newsletterSubscriptions } from '@/lib/db/schema';
import { eq, count, and, gte, isNull } from 'drizzle-orm';
import { ItemRepository } from '@/lib/repositories/item.repository';
import { postHogApiService } from '@/lib/services/posthog-api.service';
import { getTenantId } from '@/lib/auth/tenant';

export interface UserStats {
	totalUsers: number;
	registeredUsers: number; // Renamed from activeUsers for clarity
	newUsersToday: number;
	newUsersThisWeek: number;
	newUsersThisMonth: number;
}

export interface SubmissionStats {
	totalSubmissions: number;
	pendingSubmissions: number;
	approvedSubmissions: number;
	rejectedSubmissions: number;
}

export interface ActivityStats {
	totalViews: number;
	totalVotes: number;
	totalComments: number;
}

export interface NewsletterStats {
	totalSubscribers: number;
	recentSubscribers: number;
}

export interface AdminDashboardStats {
	users: UserStats;
	submissions: SubmissionStats;
	activity: ActivityStats;
	newsletter: NewsletterStats;
}

export class AdminStatsRepository {
	private readonly itemRepository = new ItemRepository();

	async getUserStats(): Promise<UserStats> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const now = new Date();
			const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
			const dow = todayUtc.getUTCDay(); // 0=Sun..6=Sat
			const weekStartUtc = new Date(todayUtc);
			weekStartUtc.setUTCDate(todayUtc.getUTCDate() - ((dow + 6) % 7)); // Monday-start week
			const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

			const [totalUsersResult, newUsersTodayResult, newUsersWeekResult, newUsersMonthResult] = await Promise.all([
				db
					.select({ count: count() })
					.from(users)
					.where(and(isNull(users.deletedAt), eq(users.tenantId, tenantId))),
				db
					.select({ count: count() })
					.from(users)
					.where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc), eq(users.tenantId, tenantId))),
				db
					.select({ count: count() })
					.from(users)
					.where(
						and(isNull(users.deletedAt), gte(users.createdAt, weekStartUtc), eq(users.tenantId, tenantId))
					),
				db
					.select({ count: count() })
					.from(users)
					.where(
						and(isNull(users.deletedAt), gte(users.createdAt, monthStartUtc), eq(users.tenantId, tenantId))
					)
			]);

			const totalUsers = Number((totalUsersResult[0] as unknown as { count: number })?.count ?? 0);

			return {
				totalUsers,
				registeredUsers: totalUsers, // All registered users (no activity tracking yet)
				newUsersToday: Number((newUsersTodayResult[0] as unknown as { count: number })?.count ?? 0),
				newUsersThisWeek: Number((newUsersWeekResult[0] as unknown as { count: number })?.count ?? 0),
				newUsersThisMonth: Number((newUsersMonthResult[0] as unknown as { count: number })?.count ?? 0)
			};
		} catch (error) {
			console.error('Error fetching user stats:', error);
			throw new Error('Failed to fetch user statistics');
		}
	}

	async getSubmissionStats(): Promise<SubmissionStats> {
		try {
			const stats = await this.itemRepository.getStats();
			return {
				totalSubmissions: stats.total,
				pendingSubmissions: stats.pending,
				approvedSubmissions: stats.approved,
				rejectedSubmissions: stats.rejected
			};
		} catch (error) {
			console.error('Error fetching submission stats:', error);
			throw new Error('Failed to fetch submission statistics');
		}
	}

	async getActivityStats(): Promise<ActivityStats> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const [totalVotesResult, totalCommentsResult, totalViews] = await Promise.all([
				db.select({ count: count() }).from(votes).where(eq(votes.tenantId, tenantId)),
				db
					.select({ count: count() })
					.from(comments)
					.where(and(isNull(comments.deletedAt), eq(comments.tenantId, tenantId))),
				postHogApiService.isConfigured() ? postHogApiService.getTotalPageViews() : Promise.resolve(0)
			]);

			return {
				totalViews,
				totalVotes: Number((totalVotesResult[0] as unknown as { count: number })?.count ?? 0),
				totalComments: Number((totalCommentsResult[0] as unknown as { count: number })?.count ?? 0)
			};
		} catch (error) {
			console.error('Error fetching activity stats:', error);
			throw new Error('Failed to fetch activity statistics');
		}
	}

	async getNewsletterStats(): Promise<NewsletterStats> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const now = new Date();
			const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
			const weekStartUtc = new Date(todayUtc);
			const dow = todayUtc.getUTCDay(); // 0=Sun..6=Sat
			weekStartUtc.setUTCDate(todayUtc.getUTCDate() - ((dow + 6) % 7)); // Monday-start week

			const [totalSubscribersResult, recentSubscribersResult] = await Promise.all([
				db
					.select({ count: count() })
					.from(newsletterSubscriptions)
					.where(
						and(eq(newsletterSubscriptions.isActive, true), eq(newsletterSubscriptions.tenantId, tenantId))
					),
				db
					.select({ count: count() })
					.from(newsletterSubscriptions)
					.where(
						and(
							eq(newsletterSubscriptions.isActive, true),
							gte(newsletterSubscriptions.subscribedAt, weekStartUtc),
							eq(newsletterSubscriptions.tenantId, tenantId)
						)
					)
			]);

			return {
				totalSubscribers: Number((totalSubscribersResult[0] as unknown as { count: number })?.count ?? 0),
				recentSubscribers: Number((recentSubscribersResult[0] as unknown as { count: number })?.count ?? 0)
			};
		} catch (error) {
			console.error('Error fetching newsletter stats:', error);
			throw new Error('Failed to fetch newsletter statistics');
		}
	}

	async getAllStats(): Promise<AdminDashboardStats> {
		try {
			const [u, s, a, n] = await Promise.allSettled([
				this.getUserStats(),
				this.getSubmissionStats(),
				this.getActivityStats(),
				this.getNewsletterStats()
			]);

			const users: UserStats =
				u.status === 'fulfilled'
					? u.value
					: {
							totalUsers: 0,
							registeredUsers: 0,
							newUsersToday: 0,
							newUsersThisWeek: 0,
							newUsersThisMonth: 0
						};
			const submissions: SubmissionStats =
				s.status === 'fulfilled'
					? s.value
					: { totalSubmissions: 0, pendingSubmissions: 0, approvedSubmissions: 0, rejectedSubmissions: 0 };
			const activity: ActivityStats =
				a.status === 'fulfilled' ? a.value : { totalViews: 0, totalVotes: 0, totalComments: 0 };
			const newsletter: NewsletterStats =
				n.status === 'fulfilled' ? n.value : { totalSubscribers: 0, recentSubscribers: 0 };

			return { users, submissions, activity, newsletter };
		} catch (error) {
			console.error('Error fetching all admin stats:', error);
			throw new Error('Failed to fetch admin dashboard statistics');
		}
	}
}
