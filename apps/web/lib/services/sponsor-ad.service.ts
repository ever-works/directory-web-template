/**
 * Sponsor Ad Service
 * Handles all sponsor ad-related business logic
 */

import * as sponsorAdRepo from "@/lib/repositories/sponsor-ad.repository";
import {
	SponsorAdStatus,
	SponsorAdInterval,
	type SponsorAd,
	type NewSponsorAd,
	type SponsorAdStatusValues,
} from "@/lib/db/schema";
import {
	getSponsorAdWeeklyPrice,
	getSponsorAdMonthlyPrice,
	getSponsorAdCurrency,
} from "@/lib/utils/settings";
import type {
	SponsorAdListOptions,
	SponsorAdStats,
	SponsorAdWithUser,
	CreateSponsorAdRequest,
	SponsorWithItem,
} from "@/lib/types/sponsor-ad";

// ######################### Service Class #########################

export class SponsorAdService {
	// ===================== Read Operations =====================

	/**
	 * Get sponsor ad by ID
	 */
	async getSponsorAdById(id: string): Promise<SponsorAd | null> {
		return await sponsorAdRepo.getSponsorAdById(id);
	}

	/**
	 * Get sponsor ad with user details
	 */
	async getSponsorAdWithUser(id: string): Promise<SponsorAdWithUser | null> {
		return await sponsorAdRepo.getSponsorAdWithUser(id);
	}

	/**
	 * Get all sponsor ads for a user
	 */
	async getSponsorAdsByUserId(userId: string): Promise<SponsorAd[]> {
		return await sponsorAdRepo.getSponsorAdsByUserId(userId);
	}

	/**
	 * Get active sponsor ads for display
	 */
	async getActiveSponsorAds(limit?: number): Promise<SponsorAd[]> {
		return await sponsorAdRepo.getActiveSponsorAds(limit);
	}

	/**
	 * Get active sponsor ads with their associated item data
	 * Used for sidebar sponsor display where item info is needed
	 */
	async getActiveSponsorAdsWithItems(limit?: number): Promise<SponsorWithItem[]> {
		return await sponsorAdRepo.getActiveSponsorAdsWithItems(limit);
	}

	/**
	 * Get pending sponsor ads for admin review
	 */
	async getPendingSponsorAds(): Promise<SponsorAd[]> {
		return await sponsorAdRepo.getPendingSponsorAds();
	}

	/**
	 * Get sponsor ads with pagination and filters
	 */
	async getSponsorAdsPaginated(options: SponsorAdListOptions = {}): Promise<{
		sponsorAds: SponsorAd[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}> {
		return await sponsorAdRepo.getSponsorAdsPaginated(options);
	}

	/**
	 * Get sponsor ad statistics
	 */
	async getSponsorAdStats(): Promise<SponsorAdStats> {
		return await sponsorAdRepo.getSponsorAdStats();
	}

	/**
	 * Get sponsor ad statistics for a specific user
	 */
	async getSponsorAdStatsByUser(userId: string): Promise<SponsorAdStats> {
		return await sponsorAdRepo.getSponsorAdStatsByUser(userId);
	}

	// ===================== Write Operations =====================

	/**
	 * Create a new sponsor ad submission
	 * Status starts as PENDING_PAYMENT until user pays
	 */
	async createSponsorAd(
		userId: string,
		data: CreateSponsorAdRequest
	): Promise<SponsorAd> {
		// Check if user already has pending or active sponsor ad for this item
		const hasPending = await sponsorAdRepo.hasPendingSponsorAdForItem(
			userId,
			data.itemSlug
		);
		if (hasPending) {
			throw new Error(
				"You already have a pending sponsorship for this item"
			);
		}

		const hasActive = await sponsorAdRepo.hasActiveSponsorAdForItem(
			userId,
			data.itemSlug
		);
		if (hasActive) {
			throw new Error(
				"You already have an active sponsorship for this item"
			);
		}

		// Calculate amount based on interval
		const amount = this.getAmountForInterval(data.interval);

		const newSponsorAd: NewSponsorAd = {
			userId,
			itemSlug: data.itemSlug,
			interval: data.interval,
			amount,
			currency: "usd",
			paymentProvider: data.paymentProvider,
			status: SponsorAdStatus.PENDING_PAYMENT, // Start as pending payment
		};

		return await sponsorAdRepo.createSponsorAd(newSponsorAd);
	}

	/**
	 * Approve sponsor ad (admin only)
	 * This auto-activates the ad immediately
	 * Can approve from PENDING (normal flow) or PENDING_PAYMENT (force approve)
	 */
	async approveSponsorAd(
		id: string,
		adminUserId: string,
		forceApprove: boolean = false
	): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		// Normal approval from PENDING status (payment already received)
		if (sponsorAd.status === SponsorAdStatus.PENDING) {
			// Calculate dates and activate directly
			const startDate = new Date();
			const endDate = this.calculateEndDate(startDate, sponsorAd.interval);

			// Update status to ACTIVE and set dates
			return await sponsorAdRepo.updateSponsorAd(id, {
				status: SponsorAdStatus.ACTIVE,
				startDate,
				endDate,
				reviewedBy: adminUserId,
				reviewedAt: new Date(),
			});
		}

		// Force approval from PENDING_PAYMENT status (no payment yet)
		if (sponsorAd.status === SponsorAdStatus.PENDING_PAYMENT) {
			if (!forceApprove) {
				throw new Error("PAYMENT_NOT_RECEIVED");
			}

			// Force approve and activate without payment
			const startDate = new Date();
			const endDate = this.calculateEndDate(startDate, sponsorAd.interval);

			return await sponsorAdRepo.updateSponsorAd(id, {
				status: SponsorAdStatus.ACTIVE,
				startDate,
				endDate,
				reviewedBy: adminUserId,
				reviewedAt: new Date(),
			});
		}

		throw new Error(
			`Cannot approve sponsor ad with status: ${sponsorAd.status}`
		);
	}

	/**
	 * Confirm payment received (called by payment webhook)
	 * Changes status from PENDING_PAYMENT to PENDING
	 */
	async confirmPayment(
		id: string,
		subscriptionId?: string,
		customerId?: string
	): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		if (sponsorAd.status !== SponsorAdStatus.PENDING_PAYMENT) {
			throw new Error(
				`Cannot confirm payment for sponsor ad with status: ${sponsorAd.status}`
			);
		}

		return await sponsorAdRepo.updateSponsorAd(id, {
			status: SponsorAdStatus.PENDING,
			subscriptionId: subscriptionId || undefined,
			customerId: customerId || undefined,
		});
	}

	/**
	 * Reject sponsor ad (admin only)
	 * Can reject from PENDING_PAYMENT or PENDING status
	 */
	async rejectSponsorAd(
		id: string,
		adminUserId: string,
		rejectionReason: string
	): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		// Can reject from pending_payment or pending status
		const rejectableStatuses: SponsorAdStatusValues[] = [
			SponsorAdStatus.PENDING_PAYMENT,
			SponsorAdStatus.PENDING,
		];

		if (!rejectableStatuses.includes(sponsorAd.status as SponsorAdStatusValues)) {
			throw new Error(
				`Cannot reject sponsor ad with status: ${sponsorAd.status}`
			);
		}

		return await sponsorAdRepo.rejectSponsorAd(id, adminUserId, rejectionReason);
	}

	/**
	 * Cancel sponsor ad
	 */
	async cancelSponsorAd(
		id: string,
		cancelReason?: string
	): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		// Can cancel pending_payment, pending, or active sponsor ads
		const cancellableStatuses: SponsorAdStatusValues[] = [
			SponsorAdStatus.PENDING_PAYMENT,
			SponsorAdStatus.PENDING,
			SponsorAdStatus.ACTIVE,
		];

		if (!cancellableStatuses.includes(sponsorAd.status as SponsorAdStatusValues)) {
			throw new Error(
				`Cannot cancel sponsor ad with status: ${sponsorAd.status}`
			);
		}

		return await sponsorAdRepo.cancelSponsorAd(id, cancelReason);
	}

	/**
	 * Expire sponsor ad (called by cron job or webhook)
	 */
	async expireSponsorAd(id: string): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		if (sponsorAd.status !== SponsorAdStatus.ACTIVE) {
			throw new Error(
				`Cannot expire sponsor ad with status: ${sponsorAd.status}`
			);
		}

		return await sponsorAdRepo.expireSponsorAd(id);
	}

	/**
	 * Renew sponsor ad subscription
	 */
	async renewSponsorAd(id: string): Promise<SponsorAd | null> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		// Can only renew active or expired sponsor ads
		if (
			sponsorAd.status !== SponsorAdStatus.ACTIVE &&
			sponsorAd.status !== SponsorAdStatus.EXPIRED
		) {
			throw new Error(
				`Cannot renew sponsor ad with status: ${sponsorAd.status}`
			);
		}

		// Calculate new end date from current end date or now
		const startDate = sponsorAd.endDate || new Date();
		const endDate = this.calculateEndDate(startDate, sponsorAd.interval);

		return await sponsorAdRepo.updateSponsorAd(id, {
			status: SponsorAdStatus.ACTIVE,
			startDate,
			endDate,
		});
	}

	/**
	 * Delete sponsor ad (admin only, hard delete)
	 */
	async deleteSponsorAd(id: string): Promise<void> {
		const sponsorAd = await sponsorAdRepo.getSponsorAdById(id);

		if (!sponsorAd) {
			throw new Error("Sponsor ad not found");
		}

		await sponsorAdRepo.deleteSponsorAd(id);
	}

	// ===================== Helper Methods =====================

	/**
	 * Get amount for interval
	 * Uses configurable pricing from settings (getSponsorAdWeeklyPrice/getSponsorAdMonthlyPrice
	 * already have built-in defaults, so no additional fallback needed)
	 */
	getAmountForInterval(interval: string): number {
		if (interval === SponsorAdInterval.WEEKLY) {
			return getSponsorAdWeeklyPrice();
		}
		if (interval === SponsorAdInterval.MONTHLY) {
			return getSponsorAdMonthlyPrice();
		}
		throw new Error(`Invalid interval: ${interval}`);
	}

	/**
	 * Get configured currency for sponsor ads
	 */
	getCurrency(): string {
		return getSponsorAdCurrency();
	}

	/**
	 * Calculate end date based on interval
	 */
	calculateEndDate(startDate: Date, interval: string): Date {
		const endDate = new Date(startDate);

		if (interval === SponsorAdInterval.WEEKLY) {
			endDate.setDate(endDate.getDate() + 7);
		} else if (interval === SponsorAdInterval.MONTHLY) {
			endDate.setMonth(endDate.getMonth() + 1);
		} else {
			throw new Error(`Invalid interval: ${interval}`);
		}

		return endDate;
	}

	/**
	 * Format amount for display
	 */
	formatAmount(amount: number, currency: string = "usd"): string {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		});
		return formatter.format(amount);
	}

	/**
	 * Get interval display name
	 */
	getIntervalDisplayName(interval: string): string {
		const names: Record<string, string> = {
			[SponsorAdInterval.WEEKLY]: "Weekly",
			[SponsorAdInterval.MONTHLY]: "Monthly",
		};
		return names[interval] || interval;
	}

	/**
	 * Get status display name
	 */
	getStatusDisplayName(status: string): string {
		const names: Record<string, string> = {
			[SponsorAdStatus.PENDING_PAYMENT]: "Waiting for Payment",
			[SponsorAdStatus.PENDING]: "Pending Review",
			[SponsorAdStatus.REJECTED]: "Rejected",
			[SponsorAdStatus.ACTIVE]: "Active",
			[SponsorAdStatus.EXPIRED]: "Expired",
			[SponsorAdStatus.CANCELLED]: "Cancelled",
		};
		return names[status] || status;
	}

	/**
	 * Check if sponsor ad can be edited
	 */
	canEdit(sponsorAd: SponsorAd): boolean {
		return sponsorAd.status === SponsorAdStatus.PENDING_PAYMENT;
	}

	/**
	 * Check if sponsor ad can be cancelled
	 */
	canCancel(sponsorAd: SponsorAd): boolean {
		return ([
			SponsorAdStatus.PENDING_PAYMENT,
			SponsorAdStatus.PENDING,
			SponsorAdStatus.ACTIVE,
		] as SponsorAdStatusValues[]).includes(sponsorAd.status as SponsorAdStatusValues);
	}

	/**
	 * Check if payment has been received
	 */
	hasPayment(sponsorAd: SponsorAd): boolean {
		return sponsorAd.status !== SponsorAdStatus.PENDING_PAYMENT;
	}
}

// Export singleton instance
export const sponsorAdService = new SponsorAdService();
