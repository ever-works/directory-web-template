// ######################### Sponsor Ad Types #########################

import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

// ######################### Display Types #########################

/**
 * Sponsor ad with associated item data, carrying the full `sponsor_ads` row
 * (user, payment and review ids included). Server-side only: public
 * responses use `PublicSponsorWithItem`.
 */
export interface SponsorWithItem {
	sponsor: SponsorAd;
	item: ItemData | null;
}

/**
 * The sponsor ad fields that may leave the server in a public response
 * (`GET /api/sponsor-ads`). Built by `toPublicSponsorAd`
 * (`lib/sponsor-ads/public-sponsor-ad.ts`).
 */
export type PublicSponsorAd = Pick<SponsorAd, 'id' | 'itemSlug' | 'status' | 'interval' | 'startDate' | 'endDate'>;

/**
 * Sponsor ad with associated item data for public display.
 * Used by `GET /api/sponsor-ads` and the sponsor UI components.
 */
export interface PublicSponsorWithItem {
	sponsor: PublicSponsorAd;
	item: ItemData | null;
}

// Status and Interval types
export type SponsorAdStatus = 'pending_payment' | 'pending' | 'rejected' | 'active' | 'expired' | 'cancelled';
export type SponsorAdIntervalType = 'weekly' | 'monthly';

// ######################### Request Types #########################

export interface CreateSponsorAdRequest {
	itemSlug: string;
	interval: SponsorAdIntervalType;
	paymentProvider: string;
}

export interface UpdateSponsorAdRequest {
	id: string;
	status?: SponsorAdStatus;
	startDate?: Date;
	endDate?: Date;
	subscriptionId?: string;
	customerId?: string;
}

export interface ApproveSponsorAdRequest {
	id: string;
}

export interface RejectSponsorAdRequest {
	id: string;
	rejectionReason: string;
}

export interface CancelSponsorAdRequest {
	id: string;
	cancelReason?: string;
}

// ######################### Response Types #########################

export type SponsorAdResponse =
	| {
			success: true;
			data: SponsorAd;
			message?: string;
	  }
	| { success: false; error: string };

export type SponsorAdListResponse =
	| {
			success: true;
			data: { sponsorAds: SponsorAd[] };
			meta: {
				page: number;
				totalPages: number;
				total: number;
				limit: number;
			};
	  }
	| { success: false; error: string };

// ######################### Query Options #########################

export interface SponsorAdListOptions {
	status?: SponsorAdStatus;
	interval?: SponsorAdIntervalType;
	userId?: string;
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
	sortOrder?: 'asc' | 'desc';
}

// ######################### Stats Types #########################

export interface SponsorAdStats {
	overview: {
		total: number;
		pendingPayment: number;
		pending: number;
		active: number;
		rejected: number;
		expired: number;
		cancelled: number;
	};
	byInterval: {
		weekly: number;
		monthly: number;
	};
	revenue: {
		totalRevenue: number;
		weeklyRevenue: number;
		monthlyRevenue: number;
	};
}

// ######################### Dashboard Response #########################

export interface SponsorAdDashboardResponse {
	success: boolean;
	data: {
		sponsorAds: SponsorAd[];
		pagination: {
			page: number;
			totalPages: number;
			total: number;
			limit: number;
		};
		stats: SponsorAdStats;
	};
	error?: string;
}

// ######################### Extended Types #########################

export interface SponsorAdWithUser extends SponsorAd {
	user?: {
		id: string;
		email: string | null;
		image: string | null;
	};
	reviewer?: {
		id: string;
		email: string | null;
	} | null;
}
